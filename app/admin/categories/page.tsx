"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CategoryGuide from "./CategoryGuide";
import LiveCategoryTree from "./LiveCategoryTree";

/** Top-level shop groups a category can be filed under. Mirrors ALL_AUTO_GROUPS
 *  in lib/catalog/categories.ts — the shop's first level is that list, not the
 *  registry, so this is what "parent category" means here. */
const PARENT_GROUPS: Array<{ key: string; name: string }> = [
  { key: "odelo", name: "Odela" },
  { key: "sako", name: "Sakoi" },
  { key: "pantalone", name: "Pantalone" },
  { key: "kosulja", name: "Košulje" },
  { key: "dzemper", name: "Džemperi" },
  { key: "prsluk", name: "Prsluci" },
  { key: "kaput", name: "Kaputi" },
  { key: "jakna", name: "Jakne" },
  { key: "obuca", name: "Obuća" },
  { key: "aksesoari", name: "Aksesoari" },
];

const parentGroupName = (key: string) => PARENT_GROUPS.find((group) => group.key === key)?.name || "";

type CategoryRow = {
  id: number;
  name: string;
  path: string[];
  parentId: number;
  parentGroup: string;
  description: string | null;
  mainColor: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  usageCount: number;
  source: string;
};

type ProductMini = {
  legacyId: number;
  sku: string;
  name: string;
  categories: Array<{ id: number; name: string; path: string[] }>;
  coverImage?: string | null;
  stockTotal?: number;
  isActive?: boolean;
  isExported?: boolean;
};

const isProductVisibleOnSite = (p: ProductMini) =>
  Boolean(p.isActive !== false && p.isExported !== false && (p.stockTotal ?? 0) > 0 && p.coverImage);

const sortByVisibility = (products: ProductMini[]): ProductMini[] =>
  [...products].sort((a, b) => {
    const av = isProductVisibleOnSite(a);
    const bv = isProductVisibleOnSite(b);
    return av === bv ? 0 : av ? -1 : 1;
  });

type DraftState = Record<
  number,
  { name: string; path: string; parentGroup: string; mainColor: string; description: string; isVisible: boolean; isFeatured: boolean }
>;

const emptyCreateForm = {
  name: "",
  path: "",
  parentGroup: "",
  mainColor: "#1f2937",
  description: "",
  isVisible: true,
  isFeatured: false,
};

const emptyDraft = {
  name: "",
  path: "",
  parentGroup: "",
  mainColor: "#1f2937",
  description: "",
  isVisible: true,
  isFeatured: false,
};

type AutoAssignResult = {
  message: string;
  productsUpdated: number;
  assignmentsMade: number;
  total: number;
};

// ---------- Unassigned products panel ----------

function UnassignedProductRow({
  product,
  visibleCategories,
  assigning,
  selectedCat,
  onSelectCat,
  onAssign,
  dimmed,
}: {
  product: ProductMini;
  visibleCategories: CategoryRow[];
  assigning: string | null;
  selectedCat: Record<number, number>;
  onSelectCat: (legacyId: number, catId: number) => void;
  onAssign: (product: ProductMini, catId: number) => void;
  dimmed?: boolean;
}) {
  const catId = selectedCat[product.legacyId] ?? 0;
  const isWorking = assigning?.startsWith(`${product.legacyId}-`);
  const rawImg = String(product.coverImage || "").trim();
  const img = rawImg.replace(/^https?:\/\/(www\.)?santos\.rs/, "").replace(/^https?:\/\/assets\.santos\.rs/, "");

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border bg-white px-3 py-2 ${dimmed ? "border-slate-100 opacity-60" : "border-amber-100"}`}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt={product.name}
          className="h-10 w-10 flex-shrink-0 rounded-md border border-slate-200 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[9px] font-semibold text-slate-400">
          NO IMG
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
        <p className="text-[10px] text-slate-500">#{product.legacyId} / {product.sku}</p>
      </div>
      <select
        value={catId}
        onChange={(e) => onSelectCat(product.legacyId, Number(e.target.value))}
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        disabled={isWorking}
      >
        <option value={0}>— kategorija —</option>
        {visibleCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.path.join(" / ") || cat.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!catId || isWorking}
        onClick={() => onAssign(product, catId)}
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
}

function UnassignedProductsPanel({
  rows,
  onAssigned,
}: {
  rows: CategoryRow[];
  onAssigned: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNoImage, setShowNoImage] = useState(false);
  const [products, setProducts] = useState<ProductMini[]>([]);
  const [totalFromApi, setTotalFromApi] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState<Record<number, number>>({});

  const fetchUnassigned = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/webshop/products?contentStatus=missing_category&activeOnly=1&exportOnly=1&pageSize=120&sort=newest",
      );
      const json = await res.json();
      setProducts((json.data || []) as ProductMini[]);
      setTotalFromApi(typeof json.pagination?.total === "number" ? json.pagination.total : null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      setTotalFromApi((prev) => (prev !== null ? prev - 1 : null));
      await onAssigned();
    } catch {
      // ignore
    } finally {
      setAssigning(null);
    }
  };

  const visibleCategories = rows.filter((r) => r.isVisible);

  // Split: with image = visible in web shop (priority), without image = less urgent
  const withImage = products.filter((p) => p.coverImage && p.coverImage.trim().length > 0);
  const noImage = products.filter((p) => !p.coverImage || p.coverImage.trim().length === 0);

  const priorityCount = withImage.length;
  const totalCount = totalFromApi ?? products.length;
  // Badge shows only products currently visible in web shop (have image)
  const badgeCount = priorityCount;

  return (
    <div className={`rounded-2xl border shadow-sm ${badgeCount > 0 ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white"}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">Neraspoređeni artikli</span>
          {badgeCount > 0 ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white" title="Vidljivi u web shopu bez kategorije">
              {badgeCount} u web shopu
            </span>
          ) : null}
          {noImage.length > 0 ? (
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              + {noImage.length} bez slike
            </span>
          ) : null}
          {badgeCount === 0 && noImage.length === 0 && !loading ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Sve ok</span>
          ) : null}
          <span className="text-xs text-slate-400">— aktivni proizvodi bez dodeljene kategorije</span>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{expanded ? "▲ Sakrij" : "▼ Prikaži"}</span>
      </button>

      {expanded ? (
        <div className="border-t border-amber-100 px-4 pb-4 pt-3">
          {loading ? (
            <p className="text-xs text-slate-400">Ucitavanje...</p>
          ) : products.length === 0 ? (
            <p className="text-xs text-slate-500">Nema neraspoređenih aktivnih proizvoda.</p>
          ) : (
            <div className="grid gap-4">
              {/* Priority: visible in web shop */}
              {withImage.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold text-amber-700">
                    ⚑ Vidljivi u web shopu ({withImage.length})
                    {totalFromApi && totalFromApi > products.length ? (
                      <span className="ml-1 font-normal text-slate-400">— prikazano {products.length} od {totalFromApi}</span>
                    ) : null}
                  </p>
                  <div className="grid gap-2">
                    {withImage.map((product) => (
                      <UnassignedProductRow
                        key={product.legacyId}
                        product={product}
                        visibleCategories={visibleCategories}
                        assigning={assigning}
                        selectedCat={selectedCat}
                        onSelectCat={(id, catId) => setSelectedCat((prev) => ({ ...prev, [id]: catId }))}
                        onAssign={(p, catId) => void handleAssign(p, catId)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Secondary: no image (not visible in web shop) */}
              {noImage.length > 0 ? (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowNoImage((v) => !v)}
                    className="mb-2 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
                  >
                    <span>{showNoImage ? "▼" : "▶"}</span>
                    <span>Bez slike — nisu vidljivi u web shopu ({noImage.length})</span>
                  </button>
                  {showNoImage ? (
                    <div className="grid gap-2">
                      {noImage.map((product) => (
                        <UnassignedProductRow
                          key={product.legacyId}
                          product={product}
                          visibleCategories={visibleCategories}
                          assigning={assigning}
                          selectedCat={selectedCat}
                          onSelectCat={(id, catId) => setSelectedCat((prev) => ({ ...prev, [id]: catId }))}
                          onAssign={(p, catId) => void handleAssign(p, catId)}
                          dimmed
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
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
  const [showLegacy, setShowLegacy] = useState(false);

  // Auto-kategorije section state
  const [autoExpandedKeys, setAutoExpandedKeys] = useState<Set<string>>(new Set());
  const [autoGroupProducts, setAutoGroupProducts] = useState<Record<string, ProductMini[]>>({});
  const [autoGroupLoading, setAutoGroupLoading] = useState<Set<string>>(new Set());
  const [autoGroupTotals, setAutoGroupTotals] = useState<Record<string, number>>({});

  // Active auto groups (enabled/disabled toggles)
  const [enabledAutoGroups, setEnabledAutoGroups] = useState<Set<string>>(
    new Set(["odelo","sako","pantalone","kosulja","dzemper","prsluk","kaput","jakna","obuca","aksesoari"])
  );
  const [savingAutoGroups, setSavingAutoGroups] = useState(false);

  // SKU search for manual force-add to auto-kategorije
  const [autoGroupSkuInput, setAutoGroupSkuInput] = useState<Record<string, string>>({});
  const [autoGroupSkuResults, setAutoGroupSkuResults] = useState<Record<string, ProductMini[]>>({});
  const [autoGroupSkuLoading, setAutoGroupSkuLoading] = useState<Set<string>>(new Set());
  const [forcingProduct, setForcingProduct] = useState<string | null>(null); // "legacyId-groupKey"
  const autoSkuTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  /** Scroll target for "+ podkategorija" in the live tree above. */
  const createFormRef = useRef<HTMLDivElement | null>(null);

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
      const [catRes, autoRes] = await Promise.all([
        fetch("/api/admin/webshop/categories"),
        fetch("/api/admin/webshop/categories/auto-groups"),
      ]);
      const json = await catRes.json();
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
              parentGroup: item.parentGroup || "",
              mainColor: item.mainColor || "#1f2937",
              description: item.description || "",
              isVisible: item.isVisible,
              isFeatured: item.isFeatured ?? false,
            },
          ]),
        ),
      );
      const autoJson = await autoRes.json();
      if (autoJson?.success && Array.isArray(autoJson.enabledGroups)) {
        setEnabledAutoGroups(new Set(autoJson.enabledGroups as string[]));
      }
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : null) || "Ucitavanje kategorija nije uspelo.");
    } finally {
      setLoading(false);
    }
  };

  const saveAutoGroups = async (next: Set<string>) => {
    setSavingAutoGroups(true);
    try {
      await fetch("/api/admin/webshop/categories/auto-groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledGroups: Array.from(next) }),
      });
    } finally {
      setSavingAutoGroups(false);
    }
  };

  const toggleAutoGroupEnabled = (key: string) => {
    setEnabledAutoGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      void saveAutoGroups(next);
      return next;
    });
  };

  useEffect(() => {
    void load();
  }, []);

  // Registry/merged = admin-created categories that appear in web-shop filter.
  // Catalog-only = legacy mOffice categories from raw product data (informational only).
  const registryRows = useMemo(() => rows.filter((r) => r.source === "registry" || r.source === "merged"), [rows]);
  const catalogOnlyRows = useMemo(() => rows.filter((r) => r.source === "catalog"), [rows]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = registryRows;
    if (!normalizedQuery) return base;
    return base.filter((row) =>
      [row.name, row.path.join(" / "), String(row.id)].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [query, registryRows]);

  const visibleLegacyRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return catalogOnlyRows;
    return catalogOnlyRows.filter((row) =>
      [row.name, row.path.join(" / "), String(row.id)].join(" ").toLowerCase().includes(normalizedQuery),
    );
  }, [query, catalogOnlyRows]);

  const loadCategoryProducts = async (categoryId: number) => {
    setLoadingProducts((prev) => new Set([...prev, categoryId]));
    try {
      const res = await fetch(`/api/admin/webshop/products?categoryId=${categoryId}&pageSize=100`);
      const json = await res.json();
      setCategoryProducts((prev) => ({
        ...prev,
        [categoryId]: sortByVisibility((json.data || []) as ProductMini[]),
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

  const loadAutoGroupProducts = async (groupKey: string) => {
    setAutoGroupLoading((prev) => new Set([...prev, groupKey]));
    try {
      const res = await fetch(
        `/api/admin/webshop/products?categoryGroup=${encodeURIComponent(groupKey)}&pageSize=60&activeOnly=1&exportOnly=1`,
      );
      const json = await res.json();
      setAutoGroupProducts((prev) => ({ ...prev, [groupKey]: sortByVisibility((json.data || []) as ProductMini[]) }));
      setAutoGroupTotals((prev) => ({
        ...prev,
        [groupKey]: typeof json.pagination?.total === "number" ? json.pagination.total : (json.data || []).length,
      }));
    } catch {
      // ignore
    } finally {
      setAutoGroupLoading((prev) => {
        const next = new Set(prev);
        next.delete(groupKey);
        return next;
      });
    }
  };

  const toggleAutoGroup = (groupKey: string) => {
    setAutoExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
        if (!autoGroupProducts[groupKey]) {
          void loadAutoGroupProducts(groupKey);
        }
      }
      return next;
    });
  };

  const searchAutoGroupBySku = async (groupKey: string, sku: string) => {
    if (!sku.trim()) {
      setAutoGroupSkuResults((prev) => ({ ...prev, [groupKey]: [] }));
      return;
    }
    setAutoGroupSkuLoading((prev) => new Set([...prev, groupKey]));
    try {
      const res = await fetch(`/api/admin/webshop/products?q=${encodeURIComponent(sku.trim())}&pageSize=10`);
      const json = await res.json();
      setAutoGroupSkuResults((prev) => ({ ...prev, [groupKey]: (json.data || []) as ProductMini[] }));
    } catch {
      // ignore
    } finally {
      setAutoGroupSkuLoading((prev) => { const n = new Set(prev); n.delete(groupKey); return n; });
    }
  };

  const handleAutoSkuInput = (groupKey: string, value: string) => {
    setAutoGroupSkuInput((prev) => ({ ...prev, [groupKey]: value }));
    clearTimeout(autoSkuTimers.current[groupKey]);
    autoSkuTimers.current[groupKey] = setTimeout(() => {
      void searchAutoGroupBySku(groupKey, value);
    }, 400);
  };

  const forceGroupAssign = async (product: ProductMini, groupKey: string, action: "add" | "remove") => {
    const key = `${product.legacyId}-${groupKey}`;
    setForcingProduct(key);
    try {
      const res = await fetch("/api/admin/webshop/categories/force-group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legacyId: product.legacyId, groupKey, action }),
      });
      const json = await res.json();
      if (!json?.success) return;
      // Reload the group products to reflect the change
      await loadAutoGroupProducts(groupKey);
      if (action === "add") {
        setAutoGroupSkuInput((prev) => ({ ...prev, [groupKey]: "" }));
        setAutoGroupSkuResults((prev) => ({ ...prev, [groupKey]: [] }));
      }
    } catch {
      // ignore
    } finally {
      setForcingProduct(null);
    }
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
          parentGroup: createForm.parentGroup,
          mainColor: createForm.mainColor || null,
          description: createForm.description || null,
          isVisible: createForm.isVisible,
          isFeatured: createForm.isFeatured,
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
          parentGroup: draft.parentGroup,
          mainColor: draft.mainColor || null,
          description: draft.description || null,
          isVisible: draft.isVisible,
          isFeatured: draft.isFeatured,
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
            Upravljaj web-shop kategorijama. Auto-kategorije rade odmah bez podešavanja.
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

      <CategoryGuide />

      <LiveCategoryTree
        onChanged={load}
        onCreateSubcategory={(groupKey, groupName) => {
          /* Prefill the create form below and scroll to it, rather than opening a
             second form — one place where categories get created. */
          setCreateForm((prev) => ({ ...prev, parentGroup: groupKey, name: "", path: "" }));
          setNotice(`Nova podkategorija ispod: ${groupName}. Upisi naziv u formi "Nova admin kategorija".`);
          if (typeof window !== "undefined") {
            createFormRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }}
      />

      {/* Aktivne kategorije u sajtu */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-sm font-semibold text-slate-800">Aktivne kategorije u sajtu</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Ove kategorije se prikazuju u web-shop filteru (tabovi iznad proizvoda, sidebar i dropdown).
            Ukljucuje i auto-kategorije i rucno kreirane admin kategorije.
          </p>
        </div>

        {/* Auto-kategorije toggles */}
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">
            Auto-kategorije {savingAutoGroups ? <span className="text-blue-400 normal-case font-normal tracking-normal">— cuvanje...</span> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "odelo",     name: "Odela" },
              { key: "sako",      name: "Sakoi" },
              { key: "pantalone", name: "Pantalone" },
              { key: "kosulja",   name: "Kosulje" },
              { key: "dzemper",   name: "Dzemperi" },
              { key: "prsluk",    name: "Prsluci" },
              { key: "kaput",     name: "Kaputi" },
              { key: "jakna",     name: "Jakne" },
              { key: "obuca",     name: "Obuca" },
              { key: "aksesoari", name: "Aksesoari" },
            ].map((group) => {
              const active = enabledAutoGroups.has(group.key);
              return (
                <button
                  key={group.key}
                  type="button"
                  disabled={savingAutoGroups}
                  onClick={() => toggleAutoGroupEnabled(group.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin kategorije */}
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2">Admin kategorije (rucno kreirane)</p>
          {registryRows.filter((r) => r.isVisible).length === 0 ? (
            <p className="text-xs text-slate-400">Nema rucno kreiranih vidljivih kategorija. Dodaj ih ispod.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {registryRows.filter((r) => r.isVisible).map((row) => (
                <span
                  key={row.id}
                  className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {row.path.join(" / ") || row.name}
                  {row.isFeatured ? <span className="text-[10px] text-blue-500">*</span> : null}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <UnassignedProductsPanel rows={rows} onAssigned={load} />

      <div className="grid gap-4 xl:grid-cols-[360px,minmax(0,1fr)]">
        {/* Create form */}
        <div ref={createFormRef} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Nova admin kategorija</p>
          <p className="mb-3 text-xs text-slate-400">
            Koristite za posebne kolekcije, podtipove ili sezonske filere koji se ne pokrivaju auto-kategorijama.
          </p>
          <div className="grid gap-3">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Naziv kategorije"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <label className="grid gap-1 text-xs text-slate-500">
              Nadkategorija
              <select
                value={createForm.parentGroup}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, parentGroup: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
              >
                <option value="">— samostalna kategorija —</option>
                {PARENT_GROUPS.map((group) => (
                  <option key={group.key} value={group.key}>
                    {group.name}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-400">
                Podkategorija se prikazuje u drugom nivou menija ispod izabrane kategorije.
              </span>
            </label>
            <input
              value={createForm.path}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, path: e.target.value }))}
              placeholder={
                createForm.parentGroup
                  ? `Putanja (opciono) — prefiks ${parentGroupName(createForm.parentGroup)} se dodaje sam`
                  : "Putanja, npr. Obuca / Elegantna"
              }
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
                onChange={(e) => setCreateForm((prev) => ({ ...prev, isVisible: e.target.checked, isFeatured: e.target.checked ? prev.isFeatured : false }))}
              />
              Vidljiva u web-shop filteru (sidebar)
            </label>
            <label className={`inline-flex items-center gap-2 text-sm ${!createForm.isVisible ? "opacity-40" : ""}`}>
              <input
                type="checkbox"
                checked={createForm.isFeatured}
                disabled={!createForm.isVisible}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
              />
              <span>
                Istakni u gornjoj navigaciji
                <span className="ml-1 text-[11px] text-slate-400">(horizontalna traka iznad liste)</span>
              </span>
            </label>
            <button
              onClick={createCategory}
              disabled={creating}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700"
            >
              {creating ? "Kreiranje..." : "Dodaj kategoriju"}
            </button>
          </div>
        </div>

        {/* Registry category list */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Admin kategorije</p>
              <p className="text-xs text-slate-500">Kategorije koje si rucno kreirao — pojavljuju se u web-shop filteru.</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pretraga..."
              className="w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

          {!loading && registryRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
              <p className="text-sm font-semibold text-slate-600">Nema admin kategorija</p>
              <p className="mt-1 text-xs text-slate-400">
                Web shop filter vec prikazuje auto-kategorije gore. Kreiranje admin kategorija potrebno je samo
                za posebne filere (npr. &quot;Nova kolekcija&quot;, &quot;Outlet&quot;, podtipovi obuće i sl.).
              </p>
            </div>
          ) : null}

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
                        {row.isFeatured && row.isVisible ? (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700">
                            ★ Nav
                          </span>
                        ) : null}
                        {row.parentGroup ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700">
                            ↳ {parentGroupName(row.parentGroup) || row.parentGroup}
                          </span>
                        ) : null}
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
                      <select
                        value={draft?.parentGroup || ""}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...(prev[row.id] || draft || emptyDraft), parentGroup: e.target.value },
                          }))
                        }
                        title="Nadkategorija"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                      >
                        <option value="">— bez nadkategorije —</option>
                        {PARENT_GROUPS.map((group) => (
                          <option key={group.key} value={group.key}>
                            Podkategorija od: {group.name}
                          </option>
                        ))}
                      </select>
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
                      <div className="flex flex-col gap-1.5">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(draft?.isVisible)}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: {
                                  ...(prev[row.id] || draft || emptyDraft),
                                  isVisible: e.target.checked,
                                  isFeatured: e.target.checked ? (prev[row.id]?.isFeatured ?? false) : false,
                                },
                              }))
                            }
                          />
                          Vidljiva u web-shop filteru (sidebar)
                        </label>
                        <label className={`inline-flex items-center gap-2 text-sm ${!draft?.isVisible ? "opacity-40" : ""}`}>
                          <input
                            type="checkbox"
                            checked={Boolean(draft?.isFeatured)}
                            disabled={!draft?.isVisible}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [row.id]: { ...(prev[row.id] || draft || emptyDraft), isFeatured: e.target.checked },
                              }))
                            }
                          />
                          <span>
                            Istakni u gornjoj navigaciji
                            <span className="ml-1 text-[11px] text-slate-400">(chip traka)</span>
                          </span>
                        </label>
                      </div>

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
                          {products.map((product) => {
                            const visible = isProductVisibleOnSite(product);
                            return (
                            <div key={product.legacyId} className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 ${visible ? "border-slate-200" : "border-amber-100"}`}>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                                <p className="text-[10px] text-slate-500">
                                  #{product.legacyId} / {product.sku}
                                  {!visible && (
                                    <span className="ml-1.5 text-amber-600">· nije vidljiv na sajtu</span>
                                  )}
                                </p>
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
                            );
                          })}
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

          </div>
        </div>
      </div>

      {/* Auto-kategorije — expandable panels showing products per keyword group */}
      <div className="rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div className="px-4 py-3 border-b border-blue-50">
          <p className="text-sm font-semibold text-slate-800">Auto-kategorije — pregled proizvoda</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Klikni na grupu da vidis koje artikle auto-kategorija prikazuje u web shopu. Proizvodi se
            matchuju automatski po ključnoj reči u nazivu ili mOffice kategoriji. Možeš i ručno dodati
            artikal po SKU unutar svake grupe.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {[
            { key: "odelo",     name: "Odela",     hint: "naziv sadrži: odelo, odela" },
            { key: "sako",      name: "Sakoi",     hint: "naziv sadrži: sako" },
            { key: "pantalone", name: "Pantalone", hint: "naziv sadrži: pantalone" },
            { key: "kosulja",   name: "Košulje",   hint: "naziv sadrži: košulja, kosulja" },
            { key: "dzemper",   name: "Džemperi",  hint: "naziv sadrži: džemper, dzemper" },
            { key: "prsluk",    name: "Prsluci",   hint: "naziv sadrži: prsluk" },
            { key: "kaput",     name: "Kaputi",    hint: "naziv sadrži: kaput" },
            { key: "jakna",     name: "Jakne",     hint: "naziv sadrži: jakna" },
            { key: "obuca",     name: "Obuća",     hint: "naziv sadrži: cipele, obuca" },
            { key: "aksesoari", name: "Aksesoari", hint: "kaiš, kravata, novčanik, torba, card-holder" },
          ].map((group) => {
            const isExpanded = autoExpandedKeys.has(group.key);
            const isLoading = autoGroupLoading.has(group.key);
            const products = autoGroupProducts[group.key];
            const total = autoGroupTotals[group.key];

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleAutoGroup(group.key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-800">{group.name}</span>
                    <span className="text-xs text-slate-400">{group.hint}</span>
                    {total != null ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {total} artik{total === 1 ? "al" : "ala"}
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                    {isExpanded ? "▲ Sakrij" : "▼ Prikaži"}
                  </span>
                </button>

                {isExpanded ? (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 pb-4 pt-3">
                    {isLoading ? (
                      <p className="text-xs text-slate-400">Učitavanje...</p>
                    ) : !products || products.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Nema aktivnih proizvoda koji se matchuju za ovu grupu.
                        Ako očekuješ proizvode ovde, proveri da li naziv sadrži odgovarajuću ključnu reč ili ga dodaj ručno ispod.
                      </p>
                    ) : (
                      <>
                        {total != null && total > products.length ? (
                          <p className="mb-2 text-[11px] text-slate-400">
                            Prikazano {products.length} od {total} proizvoda
                          </p>
                        ) : null}
                        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                          {products.map((product) => {
                            const rawImg = String(product.coverImage || "").trim();
                            const img = rawImg.replace(/^https?:\/\/(www\.)?santos\.rs/, "").replace(/^https?:\/\/assets\.santos\.rs/, "");
                            const visible = isProductVisibleOnSite(product);
                            const forceKey = `${product.legacyId}-${group.key}`;
                            return (
                              <div key={product.legacyId} className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${visible ? "border-slate-200 bg-white" : "border-amber-100 bg-amber-50/40"}`}>
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={img}
                                    alt={product.name}
                                    className="h-8 w-8 flex-shrink-0 rounded-md border border-slate-200 object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-100 text-[8px] font-bold text-slate-400">
                                    ?
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[11px] font-semibold text-slate-800">{product.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    #{product.legacyId}
                                    {!visible && <span className="ml-1 text-amber-500">· nije vidljiv</span>}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={forcingProduct === forceKey}
                                  onClick={() => void forceGroupAssign(product, group.key, "remove")}
                                  className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-rose-600 disabled:opacity-50"
                                >
                                  {forcingProduct === forceKey ? "..." : "Ukloni"}
                                </button>
                                <a
                                  href={`/web-shop/${product.legacyId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-[10px] text-slate-400 underline hover:text-slate-600"
                                >
                                  →
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Dodaj po SKU */}
                    <div className="mt-4 border-t border-slate-200 pt-3">
                      <p className="mb-2 text-xs font-semibold text-slate-600">Dodaj proizvod ručno (po SKU)</p>
                      <p className="mb-2 text-[11px] text-slate-400">
                        Koristi ovo za artikle koji imaju sliku i lager, ali se ne pojavljuju automatski u ovoj grupi.
                      </p>
                      <input
                        value={autoGroupSkuInput[group.key] ?? ""}
                        onChange={(e) => handleAutoSkuInput(group.key, e.target.value)}
                        placeholder="Unesi SKU ili naziv..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      />
                      {autoGroupSkuLoading.has(group.key) ? (
                        <p className="mt-2 text-xs text-slate-400">Pretraga...</p>
                      ) : (autoGroupSkuResults[group.key] ?? []).length > 0 ? (
                        <div className="mt-2 grid gap-1.5">
                          {(autoGroupSkuResults[group.key] ?? []).map((product) => {
                            const alreadyIn = (products ?? []).some((p) => p.legacyId === product.legacyId);
                            const forceKey = `${product.legacyId}-${group.key}`;
                            return (
                              <div key={product.legacyId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-slate-900">{product.name}</p>
                                  <p className="text-[10px] text-slate-500">#{product.legacyId} / {product.sku}</p>
                                </div>
                                {alreadyIn ? (
                                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                                    Već u grupi
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={forcingProduct === forceKey}
                                    onClick={() => void forceGroupAssign(product, group.key, "add")}
                                    className="shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-700 disabled:opacity-50"
                                  >
                                    {forcingProduct === forceKey ? "Dodaje..." : "Dodaj"}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (autoGroupSkuInput[group.key] ?? "").trim() && !autoGroupSkuLoading.has(group.key) ? (
                        <p className="mt-2 text-xs text-slate-400">Nema rezultata za &quot;{autoGroupSkuInput[group.key]}&quot;</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legacy mOffice categories — collapsed by default */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowLegacy((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <div>
            <span className="text-sm font-semibold text-slate-700">Legacy mOffice kategorije</span>
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
              {catalogOnlyRows.length}
            </span>
            <p className="mt-0.5 text-xs text-slate-400">
              Kategorije iz mOffice sistema — nisu direktno vezane za web-shop filter. Samo informativno.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-500">
            {showLegacy ? "▲ Sakrij" : "▼ Prikaži"}
          </span>
        </button>

        {showLegacy ? (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
            <p className="mb-3 text-xs text-slate-500">
              Ove kategorije dolaze iz mOffice-a i prikazuju se u adminu radi pregleda — ali se ne prikazuju u web-shop filteru.
              Ako zelis da neka od njih postane web-shop filter, napred kreiraj novu <em>admin kategoriju</em> sa tim imenom.
            </p>
            <div className="grid gap-2">
              {visibleLegacyRows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      {row.path.join(" / ") || row.name}
                      {row.path.join(" / ") !== row.name && row.path.length > 0 ? (
                        <span className="ml-1 font-normal text-slate-400">({row.name})</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-slate-400">#{row.id} · {row.usageCount} {row.usageCount === 1 ? "proizvod" : "proizvoda"}</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    mOffice
                  </span>
                </div>
              ))}
              {visibleLegacyRows.length === 0 ? (
                <p className="text-xs text-slate-400">Nema legacy kategorija.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
