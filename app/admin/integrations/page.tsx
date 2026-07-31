"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Run = {
  id: string;
  domain: string;
  status: string;
  environment: string;
  mode: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counters: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  summary: string | null;
};

const statusClass = (status: string) => {
  switch (status) {
    case "success":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partial_success":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "failed":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "running":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("sr-RS");
};

const ANANAS_PHASE_BUTTONS = [
  { id: "catalog", label: "Katalog", hint: "Salje nove/izmenjene proizvode timu za ulistavanje (max 1x dnevno)." },
  { id: "listings", label: "Ulistani", hint: "Povlaci merchantInventoryId, warehouse i status." },
  { id: "prices", label: "Cene", hint: "Osnovne cene; vaze od sutra (00:00-03:00 odmah)." },
  { id: "stock", label: "Lager", hint: "Kolicine; ne cesce od 1x na 15 minuta." },
  { id: "discounts", label: "Akcije", hint: "SALE akcije uz validaciju trajanja, pauze i limita popusta." },
  { id: "publish", label: "Publish", hint: "Zahteva ANANAS_AUTO_PUBLISH=true." },
] as const;

export default function IntegrationsAdminPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<"stage" | "production">("stage");
  const [mode, setMode] = useState<"delta" | "full">("delta");
  const [confirmProduction, setConfirmProduction] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [ananasSkuFilter, setAnanasSkuFilter] = useState("");

  const loadRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations/runs?limit=100");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Neuspesno ucitavanje run istorije.");
      } else {
        setRuns(json.data || []);
      }
    } catch (err: any) {
      setError(err?.message || "Greska pri ucitavanju.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const runSync = async (endpoint: string, label: string, phases?: string[], skus?: string[]) => {
    setRunningAction(label);
    setError(null);
    try {
      const body: Record<string, unknown> = { environment, mode };
      if (phases?.length) body.phases = phases;
      if (skus?.length) body.skus = skus;
      if (environment === "production" && confirmProduction) {
        body.confirmProduction = "CONFIRM_PRODUCTION_SYNC";
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Sync akcija nije uspela.");
      } else {
        await loadRuns();
      }
    } catch (err: any) {
      setError(err?.message || "Sync akcija nije uspela.");
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Integrations</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Ananas + Lager Sync</h1>
        <p className="mt-1 text-sm text-slate-600">
          Manual run operations, env/mode controls and run history with retry flow.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Environment
            <select
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as "stage" | "production")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="stage">Stage</option>
              <option value="production">Production</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as "delta" | "full")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="delta">Delta</option>
              <option value="full">Full</option>
            </select>
          </label>
          <div className="md:col-span-2 flex items-end">
            <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              <input
                type="checkbox"
                checked={confirmProduction}
                onChange={(event) => setConfirmProduction(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Confirm production sync
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => runSync("/api/admin/integrations/sync", "full-cycle")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            {runningAction === "full-cycle" ? "Running..." : "Run Full Cycle"}
          </button>
          <button
            onClick={() => runSync("/api/admin/integrations/moffice/sync", "moffice")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            {runningAction === "moffice" ? "Running..." : "Run mOffice Lager"}
          </button>
          <button
            onClick={() => runSync("/api/admin/integrations/stock/inbound/sync", "legacy-stock-inbound")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            {runningAction === "legacy-stock-inbound" ? "Running..." : "Run Legacy ZIP Sync"}
          </button>
          <button
            onClick={() => runSync("/api/admin/integrations/ananas/sync", "ananas")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            {runningAction === "ananas" ? "Running..." : "Run Ananas"}
          </button>
          <button
            onClick={() => runSync("/api/admin/integrations/stock/outbound/export", "stock-outbound")}
            disabled={Boolean(runningAction)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
          >
            {runningAction === "stock-outbound" ? "Running..." : "Run Stock Outbound"}
          </button>
          <button
            onClick={loadRuns}
            disabled={loading}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 hover:border-blue-300"
          >
            Refresh
          </button>
        </div>

        {/* Ananas caps how often each part of the flow may run (catalog 1x/day,
            stock >=15 min apart), so each phase is also runnable on its own. */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ananas — pojedinacne faze</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ANANAS_PHASE_BUTTONS.map((phase) => (
              <button
                key={phase.id}
                onClick={() => runSync("/api/admin/integrations/ananas/sync", `ananas-${phase.id}`, [phase.id])}
                disabled={Boolean(runningAction)}
                title={phase.hint}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
              >
                {runningAction === `ananas-${phase.id}` ? "Running..." : phase.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scope any phase above to specific mOffice SKUs — e.g. the Ananas-requested
            pilot test ("posaljite par proizvoda preko Add products", SKU 133342/133856)
            without touching the rest of the catalog. */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Test SKU filter (opciono, zarezom odvojeni)
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={ananasSkuFilter}
              onChange={(event) => setAnanasSkuFilter(event.target.value)}
              placeholder="npr. 133342, 133856"
              className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
            <button
              onClick={() =>
                runSync(
                  "/api/admin/integrations/ananas/sync",
                  "ananas-catalog-filtered",
                  ["catalog"],
                  ananasSkuFilter.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              disabled={Boolean(runningAction) || !ananasSkuFilter.trim()}
              title="Salje samo navedene SKU-ove kroz fazu Katalog (Add products)."
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 hover:border-emerald-300 disabled:opacity-50"
            >
              {runningAction === "ananas-catalog-filtered" ? "Running..." : "Posalji test SKU-ove (Katalog)"}
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Ucitavanje run istorije...</p> : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm text-slate-700">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <th className="px-2 py-2">Run</th>
              <th className="px-2 py-2">Domain</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Env</th>
              <th className="px-2 py-2">Mode</th>
              <th className="px-2 py-2">Counters</th>
              <th className="px-2 py-2">Started</th>
              <th className="px-2 py-2">Duration</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-slate-100">
                <td className="px-2 py-2 font-mono text-[11px]">{run.id.slice(0, 8)}</td>
                <td className="px-2 py-2">{run.domain}</td>
                <td className="px-2 py-2">
                  <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(run.status)}`}>
                    {run.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-2 py-2">{run.environment}</td>
                <td className="px-2 py-2">{run.mode}</td>
                <td className="px-2 py-2 text-xs">
                  T:{run.counters.total} S:{run.counters.success} F:{run.counters.failed} K:{run.counters.skipped}
                </td>
                <td className="px-2 py-2 text-xs">{formatDateTime(run.startedAt)}</td>
                <td className="px-2 py-2 text-xs">
                  {run.durationMs == null ? "-" : `${Math.round(run.durationMs / 1000)}s`}
                </td>
                <td className="px-2 py-2">
                  <Link href={`/admin/integrations/${run.id}`} className="text-xs font-semibold text-blue-700 hover:text-blue-800">
                    Details
                  </Link>
                </td>
              </tr>
            ))}
            {!runs.length && !loading ? (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-sm text-slate-500">
                  Nema sync run podataka.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
