"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { SizeGuideCategoryImages, SizeGuideGroup, SizeGuideSettings } from "@/lib/catalog/sizeGuides";

const emptySettings: SizeGuideSettings = {
  updatedAt: null,
  imageSrc: null,
  imageAlt: "",
  categoryImages: {},
  tables: [],
};

const CATEGORY_LABELS: Record<SizeGuideGroup, string> = {
  blazer: "Sako",
  trousers: "Pantalone",
  shirt: "Košulja",
  shoes: "Obuća",
};

export default function AdminSizeGuidesPage() {
  const [settings, setSettings] = useState<SizeGuideSettings>(emptySettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCategoryImage, setUploadingCategoryImage] = useState<SizeGuideGroup | null>(null);
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

  const addTable = () => {
    const id = `custom-${Date.now()}`;
    setSettings((prev) => ({
      ...prev,
      tables: [
        ...prev.tables,
        {
          id,
          title: "Nova tabela",
          group: "shirt",
          fit: "standard",
          headers: ["Velicina", "Grudi", "Struk"],
          rows: [{ id: `${id}-row-1`, cells: ["", "", ""] }],
          notes: [],
        },
      ],
    }));
  };

  const removeTable = (tableId: string) => {
    setSettings((prev) => ({
      ...prev,
      tables: prev.tables.filter((table) => table.id !== tableId),
    }));
  };

  const addColumn = (tableId: string) => {
    updateTable(tableId, (current) => ({
      ...current,
      headers: [...current.headers, `Kolona ${current.headers.length + 1}`],
      rows: current.rows.map((row) => ({ ...row, cells: [...row.cells, ""] })),
    }));
  };

  const removeColumn = (tableId: string, headerIndex: number) => {
    updateTable(tableId, (current) => {
      if (current.headers.length <= 1) return current;
      return {
        ...current,
        headers: current.headers.filter((_, index) => index !== headerIndex),
        rows: current.rows.map((row) => ({
          ...row,
          cells: row.cells.filter((_, index) => index !== headerIndex),
        })),
      };
    });
  };

  const uploadSizeGuideImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.urls) || !json.urls[0]) {
        throw new Error(json?.message || "Upload nije uspeo.");
      }
      setSettings((prev) => ({
        ...prev,
        imageSrc: json.urls[0],
        imageAlt: prev.imageAlt || "Odredite velicinu",
      }));
      setNotice("Slika je uploadovana. Klikni Sacuvaj sve.");
    } catch (e: any) {
      setError(e?.message || "Upload slike nije uspeo.");
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadCategoryImage = async (group: SizeGuideGroup, files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingCategoryImage(group);
    setError(null);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.success || !Array.isArray(json.urls) || !json.urls[0]) {
        throw new Error(json?.message || "Upload nije uspeo.");
      }
      setSettings((prev) => ({
        ...prev,
        categoryImages: {
          ...prev.categoryImages,
          [group]: json.urls[0],
        },
      }));
      setNotice(`Slika za kategoriju "${CATEGORY_LABELS[group]}" uploadovana. Klikni Sacuvaj sve.`);
    } catch (e: any) {
      setError(e?.message || "Upload slike nije uspeo.");
    } finally {
      setUploadingCategoryImage(null);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/size-guides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageSrc: settings.imageSrc,
          imageAlt: settings.imageAlt,
          categoryImages: settings.categoryImages ?? {},
          tables: settings.tables,
        }),
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
            <button
              onClick={addTable}
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
            >
              Dodaj tabelu
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),220px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Popup slika</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Slika za &quot;Odredite velicinu&quot;</h2>
            <p className="mt-1 text-sm text-slate-600">URL ili upload slike koja se prikazuje iznad tabela u popup-u.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                value={settings.imageSrc || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, imageSrc: e.target.value || null }))}
                placeholder="URL slike"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={settings.imageAlt || ""}
                onChange={(e) => setSettings((prev) => ({ ...prev, imageAlt: e.target.value }))}
                placeholder="Alt tekst"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <label className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    void uploadSizeGuideImage(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
                {uploadingImage ? "Uploading..." : "Upload slike"}
              </label>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, imageSrc: null }))}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700"
              >
                Ukloni sliku
              </button>
            </div>
          </div>
          {settings.imageSrc ? (
            <Image
              src={settings.imageSrc}
              alt={settings.imageAlt || "Odredite velicinu"}
              width={420}
              height={260}
              className="h-44 w-full rounded-2xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
              Nema slike
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Slike po kategorijama</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Slika po vrsti proizvoda</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ako je postavljena, ova slika se prikazuje umesto globalne slike za datu kategoriju (sako, pantalone, košulja, obuća).
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {(["blazer", "trousers", "shirt", "shoes"] as SizeGuideGroup[]).map((group) => {
            const src = settings.categoryImages?.[group] || null;
            const uploading = uploadingCategoryImage === group;
            return (
              <div key={group} className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[group]}</p>
                {src ? (
                  <div className="relative">
                    <Image
                      src={src}
                      alt={CATEGORY_LABELS[group]}
                      width={400}
                      height={220}
                      className="h-36 w-full rounded-xl border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          categoryImages: { ...prev.categoryImages, [group]: undefined },
                        }))
                      }
                      className="absolute right-2 top-2 rounded-full border border-rose-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 backdrop-blur-sm"
                    >
                      Ukloni
                    </button>
                  </div>
                ) : (
                  <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                    Nema slike
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1">
                  <label className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadCategoryImage(group, e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploading ? "Uploading..." : "Upload"}
                  </label>
                  <input
                    value={src || ""}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        categoryImages: { ...prev.categoryImages, [group]: e.target.value || undefined },
                      }))
                    }
                    placeholder="ili URL"
                    className="min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        {settings.tables.map((table) => (
          <article key={table.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => addColumn(table.id)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700"
              >
                Dodaj kolonu
              </button>
              <button
                onClick={() => removeTable(table.id)}
                className="rounded-full border border-rose-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
              >
                Obrisi tabelu
              </button>
            </div>
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
                  <div key={`${table.id}-header-${headerIndex}`} className="flex gap-1">
                    <input
                      value={header}
                      onChange={(e) =>
                        updateTable(table.id, (current) => ({
                          ...current,
                          headers: current.headers.map((item, index) => (index === headerIndex ? e.target.value : item)),
                        }))
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(table.id, headerIndex)}
                      disabled={table.headers.length <= 1}
                      className="rounded-xl border border-rose-200 px-2 text-[11px] font-semibold uppercase text-rose-700 disabled:opacity-40"
                    >
                      X
                    </button>
                  </div>
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
