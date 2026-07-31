import { parseAnanasPhases, parseSkuFilter, runAnanasSync } from "@/lib/integrations/ananas/sync";
import { parseSyncEnvironment, parseSyncMode, parseSyncTrigger } from "@/lib/integrations/core/config";
import {
  completeSyncRun,
  getFailedRunItems,
  listSyncRuns,
  startSyncRun,
} from "@/lib/integrations/core/store";
import type {
  IntegrationContext,
  StartRunInput,
  SyncCounters,
  SyncDomain,
  SyncEnvironment,
  SyncMode,
  SyncRun,
  SyncTrigger,
} from "@/lib/integrations/core/types";
import { runStockInboundSync } from "@/lib/integrations/stock/inbound";
import { runStockOutboundSync } from "@/lib/integrations/stock/outbound";

type DomainResult = {
  counters: SyncCounters;
  meta?: Record<string, unknown>;
};

const mergeCounters = (base: SyncCounters, next: SyncCounters): SyncCounters => ({
  total: base.total + next.total,
  success: base.success + next.success,
  failed: base.failed + next.failed,
  skipped: base.skipped + next.skipped,
});

const statusFromCounters = (counters: SyncCounters) => {
  if (counters.failed > 0 && counters.success > 0) return "partial_success" as const;
  if (counters.failed > 0 && counters.success === 0) return "failed" as const;
  return "success" as const;
};

const buildContext = (run: SyncRun): IntegrationContext => ({
  runId: run.id,
  environment: run.environment,
  mode: run.mode,
  trigger: run.trigger,
});

export async function executeDomainSync(
  domain: SyncDomain,
  input: {
    environment?: unknown;
    mode?: unknown;
    trigger?: unknown;
    meta?: Record<string, unknown>;
  },
) {
  const startInput: StartRunInput = {
    domain,
    environment: parseSyncEnvironment(input.environment),
    mode: parseSyncMode(input.mode),
    trigger: parseSyncTrigger(input.trigger),
    meta: input.meta || {},
  };

  const run = await startSyncRun(startInput);
  const context = buildContext(run);

  let domainResult: DomainResult = {
    counters: { total: 0, success: 0, failed: 0, skipped: 0 },
    meta: {},
  };

  try {
    if (domain === "ananas") {
      // Phases are selected per cron/manual trigger; see lib/integrations/ananas/sync.ts.
      domainResult = await runAnanasSync({
        context,
        phases: parseAnanasPhases(startInput.meta?.phases),
        skus: parseSkuFilter(startInput.meta?.skus),
      });
    } else if (domain === "stock_inbound") {
      domainResult = await runStockInboundSync({ context });
    } else if (domain === "stock_outbound") {
      domainResult = await runStockOutboundSync({ context });
    } else if (domain === "orchestrator") {
      domainResult = await runFullCycle(context);
    }
  } catch (error: any) {
    domainResult.counters.failed += 1;
    domainResult.meta = {
      ...(domainResult.meta || {}),
      fatalError: error?.message || String(error),
    };
  }

  const status = statusFromCounters(domainResult.counters);
  await completeSyncRun(run.id, {
    status,
    counters: domainResult.counters,
    meta: domainResult.meta || {},
    summary: status === "success" ? "Sync completed successfully." : "Sync completed with issues.",
  });
  return { runId: run.id, status, ...domainResult };
}

export async function runFullCycle(context: IntegrationContext): Promise<DomainResult> {
  const result: DomainResult = {
    counters: { total: 0, success: 0, failed: 0, skipped: 0 },
    meta: {},
  };

  const parts = [
    await runStockInboundSync({ context }),
    await runAnanasSync({ context }),
    await runStockOutboundSync({ context }),
  ];

  for (const part of parts) {
    result.counters = mergeCounters(result.counters, part.counters);
    result.meta = { ...(result.meta || {}), ...(part.meta || {}) };
  }

  return result;
}

export async function retryFailedRun(runId: string) {
  const failedItems = await getFailedRunItems(runId);
  if (!failedItems.length) {
    return {
      message: "No failed items to retry.",
      runId: null,
    };
  }

  const runs = await listSyncRuns(500);
  const sourceRun = runs.find((run) => run.id === runId);
  const domain = sourceRun?.domain || failedItems[0].domain;

  const next = await executeDomainSync(domain, {
    environment: sourceRun?.environment || "stage",
    mode: "full",
    trigger: "retry",
    meta: {
      retryOfRunId: runId,
      failedItems: failedItems.map((item) => item.id),
    },
  });

  return {
    message: `Retry started for ${failedItems.length} items.`,
    runId: next.runId,
    domain,
  };
}

export function parseSyncInput(payload: any, defaultTrigger: SyncTrigger = "manual") {
  return {
    environment: (payload?.environment || "stage") as SyncEnvironment,
    mode: (payload?.mode || "delta") as SyncMode,
    trigger: (payload?.trigger || defaultTrigger) as SyncTrigger,
    meta: payload?.meta && typeof payload.meta === "object" ? payload.meta : {},
  };
}

