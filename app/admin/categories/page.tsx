"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryRow = {
  id: number;
  name: string;
  path: string[];
  parentId: number;
  description: string | null;
  mainColor: string | null;
  isVisible: boolean;
  usageCount: number;
  source: string;
};

type DraftState = Record<number, { name: string; path: string; mainColor: string; description: string; isVisible: boolean }>;

const emptyCreateForm = {
  name: "",
  path: "",
  mainColor: "#1f2937",
  description: "",
  isVisible: true,
};

const emptyDraft = {
  name: "",
  path: "",
  mainColor: "#1f2937",
  description: "",
  isVisible: true,
};

type AutoAssignResult = {
  message: string;
  productsUpdated: number;
  assignmentsMade: number;
  total: number;
};

export default function AdminCategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<AutoAssignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/categories");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Ucitavanje kategorija nije uspelo.");
        return;
      }
      const items = (json.data || []) as CategoryRow[];
      setRows(items);
      setDrafts(
        Object.fromEntries(
          items.map((item) => [
            item.id,
            {
              name: item.name,
              path: item.path.join(" / "),
              mainColor: item.mainColor || "#1f2937",
              description: item.description || "",
              isVisible: item.isVisible,
            },
          ]),
        ),
      );
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Ucitavanje kategorija nije uspelo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter((row) =>
      [row.name, row.path.join(" / "), String(row.id)].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [query, rows]);

  const createCategory = async () => {
    if (!createForm.name.trim()) {
      setError("Unesi naziv kategorije.");
      return;
    }
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          path: createForm.path || createForm.name,
          mainColor: createForm.mainColor || null,
          description: createForm.description || null,
          isVisible: createForm.isVisible,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Kreiranje kategorije nije uspelo.");
        return;
      }
      setCreateForm(emptyCreateForm);
      setNotice("Kategorija je dodata.");
      await load();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Kreiranje kategorije nije uspelo.");
    } finally {
      setCreating(false);
    }
  };

  const saveCategory = async (categoryId: number) => {
    const draft = drafts[categoryId];
    if (!draft || !draft.name.trim()) {
      setError("Naziv kategorije je obavezan.");
      return;
    }
    setSavingId(categoryId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: categoryId,
          name: draft.name,
          path: draft.path,
          mainColor: draft.mainColor || null,
          description: draft.description || null,
          isVisible: draft.isVisible,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Cuvanje kategorije nije uspelo.");
        return;
      }
      setNotice(`Sacuvana kategorija #${categoryId}.`);
      await load();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Cuvanje kategorije nije uspelo.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteCategory = async (categoryId: number) => {
    setSavingId(categoryId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/webshop/categories?id=${categoryId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Brisanje kategorije nije uspelo.");
        return;
      }
      setNotice(`Obrisana kategorija #${categoryId}.`);
      await load();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Brisanje kategorije nije uspelo.");
    } finally {
      setSavingId(null);
    }
  };

  const autoAssignProducts = async () => {
    setAutoAssigning(true);
    setAutoAssignResult(null);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/categories/auto-assign", { method: "POST" });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Auto-raspodela nije uspela.");
        return;
      }
      setAutoAssignResult({
        message: json.message,
        productsUpdated: json.productsUpdated || 0,
        assignmentsMade: json.assignmentsMade || 0,
        total: json.total || 0,
      });
      await load();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Auto-raspodela nije uspela.");
    } finally {
      setAutoAssigning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kategorije</h1>
          <p className="text-sm text-slate-600">
            Poseban registry za kategorije iz starog admin toka, uz automatsko presnimavanje naziva i putanje na proizvode.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={autoAssignProducts}
            disabled={autoAssigning || rows.length === 0}
            className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 disabled:opacity-50"
            title="Automatski rasporedi sve proizvode iz kataloga u odgovarajuce kategorije na osnovu naziva"
          >
            {autoAssigning ? "Rasporedjivanje..." : "Auto-rasporedi proizvode"}
          </button>
          <button
            onClick={load}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
          >
            Osvezi
          </button>
        </div>
      </div>

      {autoAssignResult ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-semibold text-violet-800">{autoAssignResult.message}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-violet-700">
            <span>Ukupno proizvoda: <strong>{autoAssignResult.total}</strong></span>
            <span>Azurirano: <strong>{autoAssignResult.productsUpdated}</strong></span>
            <span>Raspodela: <strong>{autoAssignResult.assignmentsMade}</strong></span>
          </div>
          <p className="mt-2 text-xs text-violet-600">
            Napomena: Kategorije sa imenima poput "Odela", "Sakoi", "Pantalone", "Kosulje", "Kaputi", "Jakne" se automatski prepoznaju.
            Rasporeda ce biti vidljiva u web-shop filtrima nakon sto se osvezi kes kataloga.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[360px,minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nova kategorija</p>
          <div className="grid gap-3">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Naziv kategorije"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={createForm.path}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, path: e.target.value }))}
              placeholder="Putanja, npr. Musko / Odela"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-[1fr,84px] gap-3">
              <input
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Opis (opciono)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="color"
                value={createForm.mainColor}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, mainColor: e.target.value }))}
                className="h-11 rounded-xl border border-slate-200 p-1"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createForm.isVisible}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
              />
              Vidljiva u web-shop navigaciji
            </label>
            <button
              onClick={createCategory}
              disabled={creating}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
            >
              {creating ? "Kreiranje..." : "Dodaj kategoriju"}
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-1">Prepoznata imena kategorija</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Odela, Sakoi, Pantalone, Kosulje, Kaputi, Jakne, Dzemperi, Obuca, Kaisevi, Kravate, Prsluci
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Kategorije sa ovim imenima se automatski mapiraju na proizvode i pojavljuju u web-shop navigaciji.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraga po nazivu, putanji ili ID"
              className="w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <p className="text-xs text-slate-500">Prikazano {visibleRows.length} od {rows.length}</p>
          </div>

          {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

          <div className="grid gap-3">
            {visibleRows.map((row) => {
              const draft = drafts[row.id];
              return (
                <article key={row.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        #{row.id} | {row.source}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Proizvoda u kategoriji: <strong>{row.usageCount}</strong>
                        {row.usageCount === 0 ? (
                          <span className="ml-2 text-amber-600">— pokrenite Auto-rasporedi</span>
                        ) : null}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        row.isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
                      }`}
                    >
                      {row.isVisible ? "Vidljiva" : "Sakrivena"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.1fr),minmax(0,1.1fr),100px]">
                    <input
                      value={draft?.name || ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...(prev[row.id] || draft || emptyDraft), name: e.target.value },
                        }))
                      }
                      placeholder="Naziv"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={draft?.path || ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...(prev[row.id] || draft || emptyDraft), path: e.target.value },
                        }))
                      }
                      placeholder="Putanja"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="color"
                      value={draft?.mainColor || "#1f2937"}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [row.id]: { ...(prev[row.id] || draft || emptyDraft), mainColor: e.target.value },
                        }))
                      }
                      className="h-11 rounded-xl border border-slate-200 p-1"
                    />
                  </div>

                  <textarea
                    value={draft?.description || ""}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...(prev[row.id] || draft || emptyDraft), description: e.target.value },
                      }))
                    }
                    placeholder="Opis kategorije"
                    className="mt-3 min-h-[92px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(draft?.isVisible)}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...(prev[row.id] || draft || emptyDraft), isVisible: e.target.checked },
                          }))
                        }
                      />
                      Vidljiva u web-shop navigaciji
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => saveCategory(row.id)}
                        disabled={savingId === row.id}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
                      >
                        {savingId === row.id ? "Cuvanje..." : "Sacuvaj"}
                      </button>
                      <button
                        onClick={() => deleteCategory(row.id)}
                        disabled={savingId === row.id || row.usageCount > 0}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-rose-700 disabled:opacity-50"
                      >
                        Obrisi
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!loading && visibleRows.length === 0 ? (
              <p className="text-sm text-slate-500">Nema kategorija za prikaz.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
