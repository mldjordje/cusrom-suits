"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SyncRun = {
  id: string;
  domain: string;
  status: string;
  environment: string;
  mode: string;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counters: { total: number; success: number; failed: number; skipped: number };
  summary: string | null;
  meta?: Record<string, unknown>;
};

type SyncStatusPayload = {
  latestRun: SyncRun | null;
  runs: SyncRun[];
  stockLog: Array<Record<string, unknown>>;
  stockLogError: string | null;
  tableHealth: Record<string, { exists: boolean; count: number | null; error: string | null }>;
  env: Record<string, boolean | string>;
  expectedCron: { schedule: string; label: string };
};

const statusClass = (status: string) => {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial_success") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "failed") return "border-rose-200 bg-rose-50 text-rose-700";
  if (status === "running") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("sr-RS");
};

const formatDuration = (value?: number | null) => {
  if (value == null) return "-";
  if (value < 1000) return `${value}ms`;
  const seconds = Math.round(value / 1000);
  if (seconds < 90) return `${seconds}s`;
  return `${Math.round(seconds / 60)}min`;
};

const getRunAgeHours = (run: SyncRun | null) => {
  if (!run?.startedAt) return null;
  return (Date.now() - new Date(run.startedAt).getTime()) / 36e5;
};

const runCounter = (run: SyncRun, key: string) => {
  const value = run.meta?.[key];
  return typeof value === "number" ? value : null;
};

const formatRunCounters = (run: SyncRun) => {
  const feedRows = runCounter(run, "feedRows");
  const upsertRows = runCounter(run, "upsertRows");
  const hiddenRows = runCounter(run, "hiddenRows");
  const visibleMismatchRows = runCounter(run, "visibleMismatchRows");
  if (feedRows != null || upsertRows != null || hiddenRows != null || visibleMismatchRows != null) {
    return `Feed:${feedRows ?? "-"} Upsert:${upsertRows ?? "-"} Hidden:${hiddenRows ?? "-"} Mismatch:${visibleMismatchRows ?? "-"}`;
  }
  return `T:${run.counters.total} S:${run.counters.success} F:${run.counters.failed} K:${run.counters.skipped}`;
};

export default function AdminSyncPage() {
  const [data, setData] = useState<SyncStatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latestAgeHours = useMemo(() => getRunAgeHours(data?.latestRun || null), [data]);
  const health = useMemo(() => {
    if (!data?.latestRun) return { label: "Nema run loga", tone: "rose" as const };
    if (data.latestRun.status === "failed") return { label: "Poslednji sync neuspesan", tone: "rose" as const };
    if (latestAgeHours != null && latestAgeHours > 2.5) return { label: "Kasni vise od 2h", tone: "amber" as const };
    if (data.latestRun.status === "running") return { label: "Sync u toku", tone: "blue" as const };
    return { label: "Sync izgleda uredno", tone: "emerald" as const };
  }, [data, latestAgeHours]);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/integrations/status", { cache: "no-store" });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Status nije mogao da se ucita.");
        return;
      }
      setData(json.data as SyncStatusPayload);
    } catch (err: any) {
      setError(err?.message || "Status nije mogao da se ucita.");
    } finally {
      setLoading(false);
    }
  };

  const runManual = async (endpoint: string, label: string) => {
    setRunningAction(label);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: "production", mode: "delta", confirmProduction: "CONFIRM_PRODUCTION_SYNC" }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Manualni sync nije uspeo.");
        return;
      }
      await loadStatus();
    } catch (err: any) {
      setError(err?.message || "Manualni sync nije uspeo.");
    } finally {
      setRunningAction(null);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const envRows = [
    ["Supabase URL", data?.env?.supabaseUrl],
    ["Service role", data?.env?.supabaseServiceRole],
    ["Cron secret", data?.env?.cronSecret],
    ["mOffice API key", data?.env?.mofficeApiKey],
    ["Legacy ZIP sync URL", data?.env?.stockZipUrl],
    ["MD5 URL", data?.env?.stockMd5Url],
    ["Config bucket", data?.env?.configBucket],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sync status</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Moffice, lager i integracije</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Jedno mesto za proveru da li se lager osvezava, da li postoje Supabase log tabele i sta treba proveriti na cPanelu.
            </p>
          </div>
          <button
            onClick={loadStatus}
            disabled={loading}
            className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
          >
            {loading ? "Osvezavam..." : "Osvezi status"}
          </button>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <div className={`rounded-2xl border p-4 ${statusClass(health.tone === "blue" ? "running" : health.tone === "emerald" ? "success" : health.tone === "amber" ? "partial_success" : "failed")}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">Opsti status</p>
          <p className="mt-2 text-2xl font-semibold">{health.label}</p>
          <p className="mt-1 text-xs opacity-75">Ocekivanje: {data?.expectedCron?.label || "na svaka 2 sata"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Poslednji sync</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{formatDateTime(data?.latestRun?.startedAt)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {latestAgeHours == null ? "Nema podataka" : `Pre ${latestAgeHours.toFixed(1)}h`}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Tabela run logova</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {data?.tableHealth?.integration_sync_runs?.exists ? "Postoji" : "Nije kreirana"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{data?.tableHealth?.integration_sync_runs?.count ?? 0} run zapisa</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">cPanel cron</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{data?.expectedCron?.schedule || "0 */2 * * *"}</p>
          <p className="mt-1 text-xs text-slate-500">moffice-sync.php treba da pise timestamp u log.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Run istorija</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => runManual("/api/admin/integrations/moffice/sync", "moffice")}
                disabled={Boolean(runningAction)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                {runningAction === "moffice" ? "Pokrecem..." : "mOffice sync test"}
              </button>
              <Link
                href="/api/admin/integrations/moffice/export"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
              >
                Export mOffice lager za Excel
              </Link>
              <Link href="/admin/integrations" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                Napredne integracije
              </Link>
            </div>
          </div>
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Rucni mOffice sync iz admina ide preko Vercel servera i nije pouzdan dok je mOffice whitelist vezan za cPanel IP. Realni sync treba da ide preko cPanel cron-a; admin ovde sluzi za proveru i export stanja.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Domain</th>
                  <th className="px-2 py-2">Trigger</th>
                  <th className="px-2 py-2">Vreme</th>
                  <th className="px-2 py-2">Brojaci</th>
                  <th className="px-2 py-2">Detalji</th>
                </tr>
              </thead>
              <tbody>
                {(data?.runs || []).map((run) => (
                  <tr key={run.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(run.status)}`}>
                        {run.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-xs">{run.domain}<br /><span className="text-slate-400">{run.environment} / {run.mode}</span></td>
                    <td className="px-2 py-2 text-xs">{run.trigger}</td>
                    <td className="px-2 py-2 text-xs">{formatDateTime(run.startedAt)}<br /><span className="text-slate-400">{formatDuration(run.durationMs)}</span></td>
                    <td className="px-2 py-2 text-xs">{formatRunCounters(run)}</td>
                    <td className="px-2 py-2">
                      <Link href={`/admin/integrations/${run.id}`} className="text-xs font-semibold text-blue-700">Otvori</Link>
                    </td>
                  </tr>
                ))}
                {!data?.runs?.length ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-5 text-center text-sm text-slate-500">Jos nema sync run logova.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Vercel env checklist</p>
            <div className="mt-3 grid gap-2">
              {envRows.map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${value ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {typeof value === "string" ? value : value ? "set" : "missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Supabase tabele</p>
            <div className="mt-3 grid gap-2">
              {Object.entries(data?.tableHealth || {}).map(([table, row]) => (
                <div key={table} className="rounded-xl border border-slate-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-700">{table}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${row.exists ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {row.exists ? `${row.count ?? 0}` : "missing"}
                    </span>
                  </div>
                  {row.error ? <p className="mt-1 text-xs text-rose-600">{row.error}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Sta proveriti na cPanelu</p>
            <p className="mt-2">Cron treba da ostane na `0 */2 * * *` i da komanda pokrece `moffice-sync.php` kao tanak poziv ka `/api/cron/moffice`.</p>
            <p className="mt-2">Ako nema novih run zapisa ovde, proveri `moffice-sync.log` i `moffice-cron-output.log` na cPanelu.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
