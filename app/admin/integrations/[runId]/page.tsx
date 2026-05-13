"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type RunItem = {
  id: string;
  entityType: string;
  entityId: string;
  status: string;
  message: string | null;
  createdAt: string;
  payloadHash: string | null;
};

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
  summary: string | null;
  counters: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
  meta: Record<string, unknown>;
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

export default function IntegrationRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = String(params?.runId || "");
  const [run, setRun] = useState<Run | null>(null);
  const [items, setItems] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const failedCount = useMemo(
    () => items.filter((item) => item.status === "failed").length,
    [items],
  );

  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/integrations/runs/${runId}`);
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Neuspesno ucitavanje run detalja.");
      } else {
        setRun(json.data?.run || null);
        setItems(json.data?.items || []);
      }
    } catch (err: any) {
      setError(err?.message || "Neuspesno ucitavanje run detalja.");
    } finally {
      setLoading(false);
    }
  }, [runId]);

  useEffect(() => {
    load();
  }, [load]);

  const retryFailures = async () => {
    if (!runId) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/integrations/runs/${runId}/retry-failures`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Retry nije uspeo.");
      } else {
        await load();
      }
    } catch (err: any) {
      setError(err?.message || "Retry nije uspeo.");
    } finally {
      setRetrying(false);
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "success": return "Uspešno";
      case "partial_success": return "Delimično uspešno";
      case "failed": return "Neuspešno";
      case "running": return "U toku";
      default: return s;
    }
  };

  const domainLabel = (d: string) => {
    switch (d) {
      case "stock_inbound": return "Lager — uvoz (mOffice)";
      case "stock_outbound": return "Lager — izvoz";
      case "ananas": return "Ananas marketplace";
      case "orchestrator": return "Orchestrator";
      default: return d;
    }
  };

  const triggerLabel = (t: string) => {
    switch (t) {
      case "cron": return "Automatski (cron)";
      case "manual": return "Ručno pokrenuto";
      default: return t;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sync detalji</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Izveštaj sinhronizacije</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/integrations" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
              ← Nazad
            </Link>
            <button
              onClick={retryFailures}
              disabled={retrying || failedCount === 0}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 disabled:opacity-50"
            >
              {retrying ? "Ponavljam..." : `Ponovi greške (${failedCount})`}
            </button>
            <button
              onClick={load}
              disabled={loading}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
            >
              {loading ? "Učitavam..." : "Osveži"}
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {loading && !run ? <p className="text-sm text-slate-500">Učitavanje...</p> : null}

      {run ? (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-2xl border p-4 ${statusClass(run.status)}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Status</p>
              <p className="mt-2 text-xl font-bold">{statusLabel(run.status)}</p>
              <p className="mt-1 text-xs opacity-60">{domainLabel(run.domain)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Trajanje</p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {run.durationMs == null ? "-" : run.durationMs < 1000 ? `${run.durationMs}ms` : `${Math.round(run.durationMs / 1000)}s`}
              </p>
              <p className="mt-1 text-xs text-slate-400">{triggerLabel(run.trigger)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Početak</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(run.startedAt).toLocaleString("sr-RS")}</p>
              {run.finishedAt ? (
                <p className="mt-1 text-xs text-slate-400">Kraj: {new Date(run.finishedAt).toLocaleString("sr-RS")}</p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Okruženje</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">{run.environment}</p>
              <p className="mt-1 text-xs text-slate-400">Mod: {run.mode}</p>
            </div>
          </div>

          {/* Counters + summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-4">Šta se desilo</p>

            {run.summary ? (
              <p className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{run.summary}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                <p className="text-2xl font-bold text-slate-800">{run.counters.total}</p>
                <p className="mt-1 text-xs text-slate-500">Ukupno obrađeno</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
                <p className="text-2xl font-bold text-emerald-700">{run.counters.success}</p>
                <p className="mt-1 text-xs text-emerald-600">Uspešno sinhronizovano</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
                <p className="text-2xl font-bold text-rose-700">{run.counters.failed}</p>
                <p className="mt-1 text-xs text-rose-600">Greške</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{run.counters.skipped}</p>
                <p className="mt-1 text-xs text-amber-600">Preskočeno</p>
              </div>
            </div>

            {Object.keys(run.meta || {}).length > 0 ? (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 hover:text-slate-600">
                  Meta podaci
                </summary>
                <pre className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 overflow-x-auto">
                  {JSON.stringify(run.meta, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Item logs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Log stavki {items.length > 0 ? `(${items.length})` : ""}
        </h2>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">
                  {item.entityType} <span className="font-mono text-slate-400">#{item.entityId}</span>
                </p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              {item.message ? <p className="mt-1 text-sm text-slate-700">{item.message}</p> : null}
              <p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString("sr-RS")}</p>
            </div>
          ))}
          {!items.length ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nema detaljnih log stavki za ovaj run.<br />
              <span className="text-xs">(mOffice sync ne upisuje stavke po artiklu — vidljivo je samo u summary polju iznad.)</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
