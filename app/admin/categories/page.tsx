"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

type ProductMini = {
  legacyId: number;
  sku: string;
  name: string;
  categories: Array<{ id: number; name: string; path: string[] }>;
  coverImage?: string | null;
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

// ---------- Unassigned products panel ----------

function UnassignedProductsPanel({
  rows,
  onAssigned,
}: {
  rows: CategoryRow[];
  onAssigned: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [products, setProducts] = useState<ProductMini[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null); // "legacyId-catId"
  const [selectedCat, setSelectedCat] = useState<Record<number, number>>({}); // legacyId → categoryId

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/webshop/products?contentStatus=missing_category&activeOnly=1&exportOnly=1&pageSize=100&sort=newest",
      );
      const json = await res.json();
      setProducts((json.data || []) as ProductMini[]);
      setTotal(typeof json.pagination?.total === "number" ? json.pagination.total : (json.data || []).length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always fetch count (collapsed view)
    void fetchUnassigned();
  }, []);

  const handleAssign = async (product: ProductMini, categoryId: number) => {
    const key = `${product.legacyId}-${categoryId}`;
    setAssigning(key);
    try {
      const res = await fetch("/api/admin/webshop/products/assign-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyId: product.legacyId, categoryIds: [categoryId] }),
      });
      const json = await res.json();
      if (!json?.success) return;
      setProducts((prev) => prev.filter((p) => p.legacyId !== product.legacyId));
      setTotal((prev) => (prev !== null ? prev - 1 : null));
      await onAssigned();
    } catch {
      // ignore
    } finally {
      setAssigning(null);
    }
  };

  const visibleCategories = rows.filter((r) => r.isVisible);

  const count = total ?? products.length;

  return (
    <div className={`rounded-2xl border ${count > 0 ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"} shadow-sm`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Neraspoređeni artikli</span>
          {count > 0 ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{count}</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Sve ok</span>
          )}
          <span className="text-xs text-slate-500">— aktivni proizvodi bez dodeljene kategorije</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">{expanded ? "▲ Sakrij" : "▼ Prikaži"}</span>
      </button>

      {expanded ? (
        <div className="border-t border-amber-100 px-4 pb-4 pt-3">
          {loading ? (
            <p className="text-xs text-slate-400">Ucitavanje...</p>
          ) : products.length === 0 ? (
            <p className="text-xs text-slate-500">Nema neraspoređenih aktivnih proizvoda.</p>
          ) : (
            <>
              <p className="mb-3 text-xs text-slate-500">
                Prikazano <strong>{products.length}</strong>{total && total > products.length ? ` od ${total}` : ""} — izaberi kategoriju i klikni &ldquo;Dodaj&rdquo;.
              </p>
              <div className="grid gap-2">
                {products.map((product) => {
                  const catId = selectedCat[product.legacyId] ?? 0;
                  const isWorking = assigning?.startsWith(`${product.legacyId}-`);
                  return (
                    <div
                      key={product.legacyId}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-white px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                        <p className="text-[10px] text-slate-500">#{product.legacyId} / {product.sku}</p>
                      </div>
                      <select
                        value={catId}
                        onChange={(e) => setSelectedCat((prev) => ({ ...prev, [product.legacyId]: Number(e.target.value) }))}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        disabled={isWorking}
                      >
                        <option value={0}>— izaberi kategoriju —</option>
                        {visibleCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.path.join(" / ") || cat.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!catId || isWorking}
                        onClick={() => void handleAssign(product, catId)}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-40"
                      >
                        {isWorking ? "..." : "Dodaj"}
                      </button>
                      <a
                        href={`/web-shop/${product.legacyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 underline hover:text-slate-600"
                      >
                        Pogledaj
                      </a>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

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

  // Per-category product management
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [categoryProducts, setCategoryProducts] = useState<Record<number, ProductMini[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Set<number>>(new Set());
  const [productSearch, setProductSearch] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, ProductMini[]>>({});
  const [searchLoading, setSearchLoading] = useState<Set<number>>(new Set());
  const [assigningProduct, setAssigningProduct] = useState<string | null>(null); // "legacyId-categoryId"
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

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

  const loadCategoryProducts = async (categoryId: number) => {
    setLoadingProducts((prev) => new Set([...prev, categoryId]));
    try {
      const res = await fetch(`/api/admin/webshop/products?categoryId=${categoryId}&pageSize=100`);
      const json = await res.json();
      setCategoryProducts((prev) => ({
        ...prev,
        [categoryId]: (json.data || []) as ProductMini[],
      }));
    } catch {
      // ignore
    } finally {
      setLoadingProducts((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  const toggleExpand = (categoryId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
        if (!categoryProducts[categoryId]) {
          void loadCategoryProducts(categoryId);
        }
      }
      return next;
    });
  };

  const searchProducts = async (categoryId: number, q: string) => {
    if (!q.trim()) {
      setSearchResults((prev) => ({ ...prev, [categoryId]: [] }));
      return;
    }
    setSearchLoading((prev) => new Set([...prev, categoryId]));
    try {
      const res = await fetch(`/api/admin/webshop/products?q=${encodeURIComponent(q)}&pageSize=20`);
      const json = await res.json();
      setSearchResults((prev) => ({ ...prev, [categoryId]: (json.data || []) as ProductMini[] }));
    } catch {
      // ignore
    } finally {
      setSearchLoading((prev) => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  const handleSearchChange = (categoryId: number, value: string) => {
    setProductSearch((prev) => ({ ...prev, [categoryId]: value }));
    clearTimeout(searchTimers.current[categoryId]);
    searchTimers.current[categoryId] = setTimeout(() => {
      void searchProducts(categoryId, value);
    }, 400);
  };

  const assignProductToCategory = async (product: ProductMini, categoryId: number, add: boolean) => {
    const key = `${product.legacyId}-${categoryId}`;
    setAssigningProduct(key);
    try {
      // Get current admin category IDs for this product, then add or remove the target
      const allRows = rows;
      const adminIds = new Set(allRows.map((r) => r.id));
      const currentAdminCatIds = product.categories
        .filter((c) => adminIds.has(c.id))
        .map((c) => c.id);
      const nextIds = add
        ? Array.from(new Set([...currentAdminCatIds, categoryId]))
        : currentAdminCatIds.filter((id) => id !== categoryId);

      const res = await fetch("/api/admin/webshop/products/assign-categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyId: product.legacyId, categoryIds: nextIds }),
      });
      const json = await res.json();
      if (!json?.success) return;

      // Refresh the category product list
      await loadCategoryProducts(categoryId);
      // Clear search so they see the updated state
      setSearchResults((prev) => ({ ...prev, [categoryId]: [] }));
      setProductSearch((prev) => ({ ...prev, [categoryId]: "" }));
      // Refresh category counts
      await load();
    } catch {
      // ignore
    } finally {
      setAssigningProduct(null);
    }
  };

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
      // Refresh all expanded category product lists
      for (const catId of expandedIds) {
        void loadCategoryProducts(catId);
      }
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
            Upravljaj kategorijama i rasporedji proizvode iz web-shop kataloga.
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
        </div>
      ) : null}

      <UnassignedProductsPanel rows={rows} onAssigned={load} />

      <div className="grid gap-4 xl:grid-cols-[360px,minmax(0,1fr)]">
        {/* Create form */}
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

        {/* Category list */}
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
              const isExpanded = expandedIds.has(row.id);
              const products = categoryProducts[row.id] || [];
              const isLoadingProducts = loadingProducts.has(row.id);
              const searchQ = productSearch[row.id] || "";
              const results = searchResults[row.id] || [];
              const isSearchLoading = searchLoading.has(row.id);

              return (
                <article key={row.id} className="rounded-2xl border border-slate-200">
                  {/* Category header */}
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          #{row.id} | {row.source}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Proizvoda: <strong>{row.usageCount}</strong>
                          {row.usageCount === 0 ? (
                            <span className="ml-2 text-amber-600">— pokrenite Auto-rasporedi</span>
                          ) : null}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleExpand(row.id)}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                            isExpanded
                              ? "border-slate-300 bg-slate-100 text-slate-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isExpanded ? "Sakrij proizvode" : "Prikaži proizvode"}
                        </button>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                            row.isVisible ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"
                          }`}
                        >
                          {row.isVisible ? "Vidljiva" : "Sakrivena"}
                        </span>
                      </div>
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
                      className="mt-3 min-h-[60px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                  </div>

                  {/* Expanded product list */}
                  {isExpanded ? (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Proizvodi u kategoriji {row.name}
                      </p>

                      {isLoadingProducts ? (
                        <p className="text-xs text-slate-400">Ucitavanje proizvoda...</p>
                      ) : products.length === 0 ? (
                        <p className="text-xs text-slate-400">Nema proizvoda. Koristite pretragu ispod da dodate.</p>
                      ) : (
                        <div className="mb-4 grid gap-2">
                          {products.map((product) => (
                            <div key={product.legacyId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                                <p className="text-[10px] text-slate-500">#{product.legacyId} / {product.sku}</p>
                              </div>
                              <button
                                type="button"
                                disabled={assigningProduct === `${product.legacyId}-${row.id}`}
                                onClick={() => void assignProductToCategory(product, row.id, false)}
                                className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-700 disabled:opacity-50"
                              >
                                Ukloni
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Search to add products */}
                      <div className="mt-2">
                        <p className="mb-2 text-xs font-semibold text-slate-600">Dodaj proizvod u kategoriju</p>
                        <input
                          value={searchQ}
                          onChange={(e) => handleSearchChange(row.id, e.target.value)}
                          placeholder="Pretrazi po nazivu, SKU ili ID..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        />
                        {isSearchLoading ? (
                          <p className="mt-2 text-xs text-slate-400">Pretraga...</p>
                        ) : results.length > 0 ? (
                          <div className="mt-2 grid gap-1.5">
                            {results.map((product) => {
                              const alreadyIn = products.some((p) => p.legacyId === product.legacyId);
                              return (
                                <div key={product.legacyId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                                    <p className="text-[10px] text-slate-500">#{product.legacyId} / {product.sku}</p>
                                  </div>
                                  {alreadyIn ? (
                                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                      Vec u kategoriji
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={assigningProduct === `${product.legacyId}-${row.id}`}
                                      onClick={() => void assignProductToCategory(product, row.id, true)}
                                      className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-50"
                                    >
                                      {assigningProduct === `${product.legacyId}-${row.id}` ? "Dodaje..." : "Dodaj"}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : searchQ.trim() && !isSearchLoading ? (
                          <p className="mt-2 text-xs text-slate-400">Nema rezultata za &quot;{searchQ}&quot;</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
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
