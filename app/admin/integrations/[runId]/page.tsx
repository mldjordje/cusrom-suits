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

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sync Run</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Run details</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/integrations" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            Back to list
          </Link>
          <button
            onClick={retryFailures}
            disabled={retrying || failedCount === 0}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 disabled:opacity-50"
          >
            {retrying ? "Retrying..." : `Retry Failures (${failedCount})`}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}

      {run ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Run ID</p>
              <p className="font-mono text-sm">{run.id}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Domain</p>
              <p className="text-sm">{run.domain}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Status</p>
              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(run.status)}`}>
                {run.status}
              </span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Duration</p>
              <p className="text-sm">{run.durationMs == null ? "-" : `${Math.round(run.durationMs / 1000)}s`}</p>
            </div>
          </div>
          <div className="mt-3 text-sm text-slate-600">
            <p>
              Counters: total {run.counters.total}, success {run.counters.success}, failed {run.counters.failed},
              skipped {run.counters.skipped}
            </p>
            {run.summary ? <p className="mt-1">{run.summary}</p> : null}
          </div>
          <pre className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 overflow-x-auto">
            {JSON.stringify(run.meta || {}, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {item.entityType} / {item.entityId}
                </p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(item.status)}`}>
                  {item.status}
                </span>
              </div>
              {item.message ? <p className="mt-1 text-sm text-slate-700">{item.message}</p> : null}
              <p className="mt-1 text-[11px] text-slate-500">{new Date(item.createdAt).toLocaleString("sr-RS")}</p>
              {item.payloadHash ? (
                <p className="mt-1 font-mono text-[10px] text-slate-400">{item.payloadHash.slice(0, 24)}...</p>
              ) : null}
            </div>
          ))}
          {!items.length ? <p className="text-sm text-slate-500">No item logs for this run.</p> : null}
        </div>
      </div>
    </div>
  );
}
