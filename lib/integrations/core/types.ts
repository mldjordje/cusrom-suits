export type SyncDomain = "ananas" | "stock_inbound" | "stock_outbound" | "orchestrator";
export type SyncEnvironment = "stage" | "production";
export type SyncMode = "delta" | "full";
export type SyncTrigger = "manual" | "cron" | "retry";
export type SyncStatus = "running" | "success" | "partial_success" | "failed";
export type SyncItemStatus = "success" | "failed" | "skipped";

export type SyncCounters = {
  total: number;
  success: number;
  failed: number;
  skipped: number;
};

export type SyncRun = {
  id: string;
  domain: SyncDomain;
  status: SyncStatus;
  environment: SyncEnvironment;
  mode: SyncMode;
  trigger: SyncTrigger;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counters: SyncCounters;
  summary: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SyncRunItem = {
  id: string;
  runId: string;
  domain: SyncDomain;
  entityType: string;
  entityId: string;
  status: SyncItemStatus;
  message: string | null;
  payloadHash: string | null;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  retryOfItemId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StartRunInput = Pick<SyncRun, "domain" | "environment" | "mode" | "trigger"> & {
  meta?: Record<string, unknown>;
};

export type CompleteRunInput = {
  status: SyncStatus;
  summary?: string | null;
  counters?: Partial<SyncCounters>;
  meta?: Record<string, unknown>;
};

export type AddRunItemInput = Pick<
  SyncRunItem,
  "domain" | "entityType" | "entityId" | "status" | "message" | "payloadHash" | "payload" | "response"
> & {
  retryOfItemId?: string | null;
};

export type IntegrationContext = {
  runId: string;
  environment: SyncEnvironment;
  mode: SyncMode;
  trigger: SyncTrigger;
};

