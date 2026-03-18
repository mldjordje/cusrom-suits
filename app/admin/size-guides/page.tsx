"use client";

import { useEffect, useState } from "react";
import type { SizeGuideSettings } from "@/lib/catalog/sizeGuides";

const emptySettings: SizeGuideSettings = {
  updatedAt: null,
  tables: [],
};

export default function AdminSizeGuidesPage() {
  const [settings, setSettings] = useState<SizeGuideSettings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/size-guides");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Ucitavanje tabela velicina nije uspelo.");
        return;
      }
      setSettings(json.settings || emptySettings);
    } catch (e: any) {
      setError(e?.message || "Ucitavanje tabela velicina nije uspelo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateTable = (tableId: string, updater: (table: SizeGuideSettings["tables"][number]) => SizeGuideSettings["tables"][number]) => {
    setSettings((prev) => ({
      ...prev,
      tables: prev.tables.map((table) => (table.id === tableId ? updater(table) : table)),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/size-guides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: settings.tables }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Cuvanje tabela velicina nije uspelo.");
        return;
      }
      setSettings(json.settings || settings);
      setNotice("Tabele velicina su sacuvane.");
    } catch (e: any) {
      setError(e?.message || "Cuvanje tabela velicina nije uspelo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Storefront sizing</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Tabele velicina</h1>
            <p className="mt-1 text-sm text-slate-600">
              Ove vrednosti se prikazuju na svakom proizvodu kroz popup dugme &quot;Odredite velicinu&quot;.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
            >
              Osvezi
            </button>
            <button
              onClick={save}
              disabled={saving || loading || !settings.tables.length}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 disabled:opacity-60"
            >
              {saving ? "Cuvanje..." : "Sacuvaj sve"}
            </button>
          </div>
        </div>
        {settings.updatedAt ? (
          <p className="mt-3 text-xs text-slate-500">
            Poslednje cuvanje: {new Date(settings.updatedAt).toLocaleString("sr-RS")}
          </p>
        ) : null}
        {loading ? <p className="mt-3 text-sm text-slate-500">Ucitavanje...</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {notice ? <p className="mt-3 text-sm text-emerald-700">{notice}</p> : null}
      </div>

      <div className="grid gap-4">
        {settings.tables.map((table) => (
          <article key={table.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),180px,180px]">
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Naslov tabele</span>
                <input
                  value={table.title}
                  onChange={(e) => updateTable(table.id, (current) => ({ ...current, title: e.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Grupa</span>
                <select
                  value={table.group}
                  onChange={(e) => updateTable(table.id, (current) => ({ ...current, group: e.target.value as typeof current.group }))}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="blazer">Sako</option>
                  <option value="trousers">Pantalone</option>
                  <option value="shirt">Kosulja</option>
                  <option value="shoes">Obuca</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-900">Fit</span>
                <select
                  value={table.fit}
                  onChange={(e) => updateTable(table.id, (current) => ({ ...current, fit: e.target.value as typeof current.fit }))}
                  className="rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="slim">Slim</option>
                  <option value="regular">Regular</option>
                  <option value="standard">Standard</option>
                </select>
              </label>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold text-slate-900">Kolone</p>
              <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                {table.headers.map((header, headerIndex) => (
                  <input
                    key={`${table.id}-header-${headerIndex}`}
                    value={header}
                    onChange={(e) =>
                      updateTable(table.id, (current) => ({
                        ...current,
                        headers: current.headers.map((item, index) => (index === headerIndex ? e.target.value : item)),
                      }))
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Redovi</p>
                <button
                  onClick={() =>
                    updateTable(table.id, (current) => ({
                      ...current,
                      rows: [
                        ...current.rows,
                        {
                          id: `${current.id}-row-${current.rows.length + 1}`,
                          cells: current.headers.map(() => ""),
                        },
                      ],
                    }))
                  }
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Dodaj red
                </button>
              </div>

              <div className="space-y-3">
                {table.rows.map((row, rowIndex) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Red {rowIndex + 1}
                      </p>
                      <button
                        onClick={() =>
                          updateTable(table.id, (current) => ({
                            ...current,
                            rows: current.rows.filter((item) => item.id !== row.id),
                          }))
                        }
                        className="rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                      >
                        Obrisi
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                      {row.cells.map((cell, cellIndex) => (
                        <input
                          key={`${row.id}-${cellIndex}`}
                          value={cell}
                          onChange={(e) =>
                            updateTable(table.id, (current) => ({
                              ...current,
                              rows: current.rows.map((currentRow) =>
                                currentRow.id === row.id
                                  ? {
                                      ...currentRow,
                                      cells: currentRow.cells.map((item, index) => (index === cellIndex ? e.target.value : item)),
                                    }
                                  : currentRow,
                              ),
                            }))
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          placeholder={table.headers[cellIndex] || `Kolona ${cellIndex + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Napomene</p>
                <button
                  onClick={() =>
                    updateTable(table.id, (current) => ({
                      ...current,
                      notes: [...current.notes, ""],
                    }))
                  }
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                >
                  Dodaj napomenu
                </button>
              </div>

              <div className="grid gap-2">
                {table.notes.length ? (
                  table.notes.map((note, noteIndex) => (
                    <div key={`${table.id}-note-${noteIndex}`} className="flex flex-wrap gap-2">
                      <input
                        value={note}
                        onChange={(e) =>
                          updateTable(table.id, (current) => ({
                            ...current,
                            notes: current.notes.map((item, index) => (index === noteIndex ? e.target.value : item)),
                          }))
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Napomena"
                      />
                      <button
                        onClick={() =>
                          updateTable(table.id, (current) => ({
                            ...current,
                            notes: current.notes.filter((_, index) => index !== noteIndex),
                          }))
                        }
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                      >
                        Obrisi
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Nema dodatnih napomena za ovu tabelu.</p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
