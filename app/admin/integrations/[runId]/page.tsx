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
  payload?: { skus?: string[]; sku?: string; legacyIds?: (number | string)[] } | null;
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

type MofficeRow = {
  moffice_id: number | "";
  sku: string;
  ean: string;
  naziv: string;
  kategorija: string;
  velicina: string;
  moffice_kolicina: number;
  mp_cena: number;
  vp_cena: number;
  pdv: number;
  raw: Record<string, unknown>;
  site_stock_total?: number;
  site_active?: boolean;
  site_exported?: boolean;
  status?: string;
  legacy_id?: number;
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

const metaNumber = (meta: Record<string, unknown>, key: string) => {
  const value = meta?.[key];
  return typeof value === "number" ? value : null;
};

const isMofficeRun = (run: Run | null) =>
  run?.domain === "stock_inbound" &&
  (run.meta?.source === "moffice-api" ||
    run.meta?.source === "moffice-cpanel-payload" ||
    String(run.meta?.endpoint || "").toLowerCase().includes("moffice"));

const formatNumber = (value: unknown) =>
  new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 2 }).format(Number(value || 0));

export default function IntegrationRunDetailPage() {
  const params = useParams<{ runId: string }>();
  const runId = String(params?.runId || "");
  const [run, setRun] = useState<Run | null>(null);
  const [items, setItems] = useState<RunItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [mofficeRows, setMofficeRows] = useState<MofficeRow[]>([]);
  const [mofficeRowsSource, setMofficeRowsSource] = useState<string | null>(null);
  const [mofficeRowsLoading, setMofficeRowsLoading] = useState(false);
  const [mofficeQuery, setMofficeQuery] = useState("");
  const [mofficeStockFilter, setMofficeStockFilter] = useState<"all" | "in_stock" | "zero">("all");

  const failedCount = useMemo(
    () => items.filter((item) => item.status === "failed").length,
    [items],
  );

  const visibleLogItems = useMemo(
    () => items.filter((item) => item.entityType !== "moffice_feed"),
    [items],
  );

  const filteredMofficeRows = useMemo(() => {
    const query = mofficeQuery.trim().toLowerCase();
    return mofficeRows.filter((row) => {
      if (mofficeStockFilter === "in_stock" && Number(row.moffice_kolicina || 0) <= 0) return false;
      if (mofficeStockFilter === "zero" && Number(row.moffice_kolicina || 0) > 0) return false;
      if (!query) return true;
      return [row.sku, row.ean, row.naziv, row.kategorija, row.velicina, row.moffice_id]
        .some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [mofficeQuery, mofficeRows, mofficeStockFilter]);

  const mofficeTotals = useMemo(() => ({
    rows: mofficeRows.length,
    inStock: mofficeRows.filter((row) => Number(row.moffice_kolicina || 0) > 0).length,
    zero: mofficeRows.filter((row) => Number(row.moffice_kolicina || 0) <= 0).length,
    quantity: mofficeRows.reduce((sum, row) => sum + Number(row.moffice_kolicina || 0), 0),
  }), [mofficeRows]);

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
        const nextRun = json.data?.run || null;
        setRun(nextRun);
        setItems(json.data?.items || []);
        setMofficeRows([]);
        setMofficeRowsSource(null);
        if (isMofficeRun(nextRun)) {
          setMofficeRowsLoading(true);
          try {
            const rowsRes = await fetch(`/api/admin/integrations/moffice/run-rows?runId=${encodeURIComponent(runId)}`);
            const rowsJson = await rowsRes.json();
            if (rowsJson?.success) {
              setMofficeRows(rowsJson.data?.rows || []);
              setMofficeRowsSource(rowsJson.data?.source || null);
            }
          } finally {
            setMofficeRowsLoading(false);
          }
        }
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

            {run.meta?.source === "moffice-api" || run.meta?.source === "moffice-cpanel-payload" ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{metaNumber(run.meta, "feedRows") ?? "-"}</p>
                  <p className="mt-1 text-xs text-blue-600">mOffice feed redova</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">{metaNumber(run.meta, "upsertRows") ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">Upisano u katalog</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{metaNumber(run.meta, "hiddenRows") ?? "-"}</p>
                  <p className="mt-1 text-xs text-amber-600">Sakriveno sa sajta</p>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">{metaNumber(run.meta, "visibleMismatchRows") ?? "-"}</p>
                  <p className="mt-1 text-xs text-rose-600">Vidljivih neslaganja</p>
                </div>
              </div>
            ) : null}

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

      {isMofficeRun(run) ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Sve povuceno sa mOffice-a
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {mofficeRowsSource === "snapshot"
                  ? "Snapshot izvornog feed-a sacuvan uz ovaj sync."
                  : mofficeRowsSource === "reconstructed"
                    ? "Rekonstruisano iz kataloga za ovaj run."
                    : "Ucitavanje podataka za ovaj run."}
              </p>
            </div>
            <a
              href={`/api/admin/integrations/moffice/export?runId=${encodeURIComponent(runId)}`}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 hover:border-slate-300"
            >
              CSV export
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-2xl font-bold text-slate-900">{formatNumber(mofficeTotals.rows)}</p>
              <p className="mt-1 text-xs text-slate-500">Povucenih redova</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-2xl font-bold text-emerald-700">{formatNumber(mofficeTotals.inStock)}</p>
              <p className="mt-1 text-xs text-emerald-600">Sa lagerom</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
              <p className="text-2xl font-bold text-amber-700">{formatNumber(mofficeTotals.zero)}</p>
              <p className="mt-1 text-xs text-amber-600">Nula lager</p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-2xl font-bold text-blue-700">{formatNumber(mofficeTotals.quantity)}</p>
              <p className="mt-1 text-xs text-blue-600">Ukupna kolicina</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
            <input
              value={mofficeQuery}
              onChange={(event) => setMofficeQuery(event.target.value)}
              placeholder="Pretraga po SKU, EAN, nazivu, kategoriji..."
              className="min-h-10 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-300"
            />
            <select
              value={mofficeStockFilter}
              onChange={(event) => setMofficeStockFilter(event.target.value as "all" | "in_stock" | "zero")}
              className="min-h-10 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="all">Svi redovi</option>
              <option value="in_stock">Samo sa lagerom</option>
              <option value="zero">Samo nula lager</option>
            </select>
          </div>

          <div className="mt-4 max-h-[680px] overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-[1180px] w-full text-left text-xs text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">mOffice ID</th>
                  <th className="px-3 py-3">SKU</th>
                  <th className="px-3 py-3">EAN</th>
                  <th className="px-3 py-3">Naziv</th>
                  <th className="px-3 py-3">Kategorija</th>
                  <th className="px-3 py-3">Velicina</th>
                  <th className="px-3 py-3 text-right">Lager</th>
                  <th className="px-3 py-3 text-right">MP cena</th>
                  <th className="px-3 py-3 text-right">VP cena</th>
                  <th className="px-3 py-3 text-right">PDV</th>
                  <th className="px-3 py-3">Site status</th>
                  <th className="px-3 py-3">Raw</th>
                </tr>
              </thead>
              <tbody>
                {filteredMofficeRows.map((row, index) => (
                  <tr key={`${row.moffice_id}-${row.sku}-${row.ean}-${row.velicina}-${index}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{row.moffice_id || "-"}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.sku || "-"}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{row.ean || "-"}</td>
                    <td className="px-3 py-2 min-w-[240px]">{row.naziv || "-"}</td>
                    <td className="px-3 py-2">{row.kategorija || "-"}</td>
                    <td className="px-3 py-2">{row.velicina || "-"}</td>
                    <td className={`px-3 py-2 text-right font-bold ${Number(row.moffice_kolicina || 0) > 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      {formatNumber(row.moffice_kolicina)}
                    </td>
                    <td className="px-3 py-2 text-right">{row.mp_cena ? formatNumber(row.mp_cena) : "-"}</td>
                    <td className="px-3 py-2 text-right">{row.vp_cena ? formatNumber(row.vp_cena) : "-"}</td>
                    <td className="px-3 py-2 text-right">{row.pdv ? `${formatNumber(row.pdv)}%` : "-"}</td>
                    <td className="px-3 py-2">
                      {row.status ? (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase text-slate-600">
                          {row.status}
                        </span>
                      ) : row.site_stock_total != null ? (
                        <span className="text-[11px] text-slate-500">Site: {formatNumber(row.site_stock_total)}</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {Object.keys(row.raw || {}).length ? (
                        <details>
                          <summary className="cursor-pointer text-[11px] font-semibold text-blue-700">Detalji</summary>
                          <pre className="mt-2 max-h-64 w-[360px] overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">
                            {JSON.stringify(row.raw, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!filteredMofficeRows.length ? (
                  <tr>
                    <td colSpan={12} className="px-3 py-8 text-center text-sm text-slate-400">
                      {mofficeRowsLoading ? "Ucitavanje mOffice redova..." : "Nema redova za izabrani filter."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Item logs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Log stavki {visibleLogItems.length > 0 ? `(${visibleLogItems.length})` : ""}
        </h2>
        <div className="mt-3 space-y-2">
          {visibleLogItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-slate-600">
                  {item.entityType} <span className="font-mono text-slate-400">#{item.entityId}</span>
                </p>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase ${statusClass(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
              {item.payload?.sku || item.payload?.skus?.length ? (
                <p className="mt-1 text-[11px] font-mono text-slate-500">
                  SKU: {item.payload?.sku || item.payload?.skus?.join(", ")}
                </p>
              ) : null}
              {item.message ? <p className="mt-1 text-sm text-slate-700">{item.message}</p> : null}
              <p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString("sr-RS")}</p>
            </div>
          ))}
          {!visibleLogItems.length ? (
            <p className="py-4 text-center text-sm text-slate-400">
              Nema detaljnih log stavki za ovaj run.<br />
              <span className="text-xs">(Za mOffice run pogledaj tabelu iznad.)</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
