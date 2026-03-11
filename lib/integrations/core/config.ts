import type { SyncEnvironment, SyncMode, SyncTrigger } from "@/lib/integrations/core/types";

export const DEFAULT_SYNC_ENVIRONMENT: SyncEnvironment = "stage";
export const DEFAULT_SYNC_MODE: SyncMode = "delta";
export const DEFAULT_SYNC_TRIGGER: SyncTrigger = "manual";

export const parseSyncEnvironment = (value: unknown): SyncEnvironment => {
  if (value === "production" || value === "prod") return "production";
  if (value === "stage") return "stage";
  return DEFAULT_SYNC_ENVIRONMENT;
};

export const parseSyncMode = (value: unknown): SyncMode => {
  if (value === "full") return "full";
  if (value === "delta") return "delta";
  return DEFAULT_SYNC_MODE;
};

export const parseSyncTrigger = (value: unknown): SyncTrigger => {
  if (value === "cron" || value === "retry" || value === "manual") return value;
  return DEFAULT_SYNC_TRIGGER;
};

export const requireProductionConfirm = (payload: unknown) => {
  const value =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).confirmProduction
      : null;
  return value === "CONFIRM_PRODUCTION_SYNC";
};

