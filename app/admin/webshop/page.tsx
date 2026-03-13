"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type TabKey = "products" | "landing" | "akcije";
type CatalogCategory = { id: number; name: string; path: string[] };
type CatalogProduct = {
  legacyId: number;
  sku: string;
  name: string;
  priceGross: number;
  priceFinalGross: number;
  rebatePercent: number;
  stockWarehouse1: number;
  stockTotal: number;
  brand: string | null;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: number | null;
  categories: CatalogCategory[];
  coverImage?: string | null;
  images?: string[];
};
type ProductDraft = {
  name: string;
  brand: string;
  priceGross: string;
  priceFinalGross: string;
  rebatePercent: string;
  stockWarehouse1: string;
  stockTotal: string;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: string;
};
type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
type CreateDraft = {
  sku: string;
  name: string;
  categoryId: string;
  brand: string;
  priceGross: string;
  priceFinalGross: string;
  rebatePercent: string;
  taxPercent: string;
  stockWarehouse1: string;
  stockTotal: string;
  isActive: boolean;
  isExported: boolean;
  landingFeatured: boolean;
  landingPriority: string;
};
type LandingProductSectionKey =
  | "heroStripProductIds"
  | "highlightedProductIds"
  | "popularProductIds"
  | "arrivalsProductIds"
  | "saleProductIds"
  | "trendingProductIds";
type LandingSettings = {
  showSaleSection: boolean;
  saleSectionTitle: string;
  saleSectionSubtitle: string;
  heroEyebrow: string;
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaHref: string;
  bannerLeftTitle: string;
  bannerLeftButtonLabel: string;
  bannerLeftHref: string;
  bannerLeftImage: string;
  bannerRightTitle: string;
  bannerRightButtonLabel: string;
  bannerRightHref: string;
  bannerRightImage: string;
  heroStripProductIds: number[];
  highlightedProductIds: number[];
  popularProductIds: number[];
  arrivalsProductIds: number[];
  saleProductIds: number[];
  trendingProductIds: number[];
};
type PromotionScopeType = "all" | "category" | "brand" | "product";
type PromotionDiscountType = "percent" | "fixed";
type PromotionRule = {
  id: string;
  name: string;
  isActive: boolean;
  scopeType: PromotionScopeType;
  scopeValues: Array<number | string>;
  discountType: PromotionDiscountType;
  discountValue: number;
  priority: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type PromotionDraft = {
  name: string;
  isActive: boolean;
  scopeType: PromotionScopeType;
  scopeValuesText: string;
  discountType: PromotionDiscountType;
  discountValue: string;
  priority: string;
  startAt: string;
  endAt: string;
};

const tabs: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: "products", label: "Proizvodi", desc: "Katalog, cene, lager" },
  { key: "landing", label: "Landing", desc: "Hero + banneri + sekcije proizvoda" },
  { key: "akcije", label: "Akcije", desc: "Popusti i cene" },
];

const landingSectionConfig: Array<{
  key: LandingProductSectionKey;
  label: string;
  description: string;
  limit: number;
}> = [
  { key: "heroStripProductIds", label: "Hero traka", description: "Proizvodi ispod hero videa.", limit: 4 },
  { key: "highlightedProductIds", label: "Izdvojeni modeli", description: "Prva velika produkt sekcija.", limit: 8 },
  { key: "popularProductIds", label: "Popular products", description: "Popular proizvodi.", limit: 4 },
  { key: "arrivalsProductIds", label: "New arrivals", description: "Nova kolekcija sekcija.", limit: 4 },
  { key: "saleProductIds", label: "Sale sekcija", description: "Akcijski proizvodi na landing-u.", limit: 4 },
  { key: "trendingProductIds", label: "Trending now", description: "Trending proizvodi sekcija.", limit: 4 },
];

const defaultLandingPickerValue: Record<LandingProductSectionKey, string> = {
  heroStripProductIds: "",
  highlightedProductIds: "",
  popularProductIds: "",
  arrivalsProductIds: "",
  saleProductIds: "",
  trendingProductIds: "",
};

const defaultCreateDraft: CreateDraft = {
  sku: "",
  name: "",
  categoryId: "",
  brand: "",
  priceGross: "0",
  priceFinalGross: "0",
  rebatePercent: "0",
  taxPercent: "20",
  stockWarehouse1: "0",
  stockTotal: "0",
  isActive: true,
  isExported: true,
  landingFeatured: false,
  landingPriority: "",
};

const defaultLandingSettings: LandingSettings = {
  showSaleSection: true,
  saleSectionTitle: "Aktuelne Akcije",
  saleSectionSubtitle: "",
  heroEyebrow: "Santos & Santorini",
  heroTitleLine1: "Nova kolekcija",
  heroTitleLine2: "2026",
  heroPrimaryCtaLabel: "Web shop",
  heroPrimaryCtaHref: "/web-shop",
  heroSecondaryCtaLabel: "Kontakt",
  heroSecondaryCtaHref: "/kontakt",
  bannerLeftTitle: "Ready to Wear",
  bannerLeftButtonLabel: "Kupi odmah",
  bannerLeftHref: "/web-shop",
  bannerLeftImage: "/img/hero2.jpg",
  bannerRightTitle: "Aktuelne akcije",
  bannerRightButtonLabel: "Pogledaj akcije",
  bannerRightHref: "/akcije",
  bannerRightImage: "/img/hero.jpg",
  heroStripProductIds: [],
  highlightedProductIds: [],
  popularProductIds: [],
  arrivalsProductIds: [],
  saleProductIds: [],
  trendingProductIds: [],
};

const defaultPromotionDraft: PromotionDraft = {
  name: "",
  isActive: true,
  scopeType: "all",
  scopeValuesText: "",
  discountType: "percent",
  discountValue: "10",
  priority: "0",
  startAt: "",
  endAt: "",
};

const parseNumericInput = (value: string) => Number(String(value).replace(",", ".").trim());

const normalizeLegacyIdList = (value: unknown, max = 24): number[] => {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);

  const unique = new Set<number>();
  for (const raw of source) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) continue;
    unique.add(Math.floor(id));
    if (unique.size >= max) break;
  }
  return Array.from(unique);
};

const parseLegacyIdCsv = (value: string, max: number) => normalizeLegacyIdList(value, max);

const toNumberOrNull = (value: string) => {
  const n = parseNumericInput(value);
  return Number.isFinite(n) ? n : null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const toInputNumber = (value: number) => String(Number(value.toFixed(2)));

const computeSalePriceFromRebate = (priceGross: number, rebatePercent: number) =>
  Math.max(0, Number((priceGross * (1 - clampPercent(rebatePercent) / 100)).toFixed(2)));

const computeRebateFromSalePrice = (priceGross: number, priceFinalGross: number) => {
  if (!Number.isFinite(priceGross) || priceGross <= 0) return 0;
  return clampPercent(Number((((priceGross - priceFinalGross) / priceGross) * 100).toFixed(2)));
};

const toIsoFromLocal = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const parseScopeValuesText = (scopeType: PromotionScopeType, text: string): Array<number | string> => {
  if (scopeType === "all") return [];
  const tokens = String(text || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (scopeType === "category" || scopeType === "product") {
    return tokens
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value) && value > 0)
      .map((value) => Number(value));
  }
  return tokens.map((token) => token.toLowerCase());
};

const scopeValuesLabel = (rule: PromotionRule) => {
  if (rule.scopeType === "all") return "Sve";
  if (!rule.scopeValues.length) return "-";
  return rule.scopeValues.join(", ");
};

const toDraft = (item: CatalogProduct): ProductDraft => ({
  name: item.name,
  brand: item.brand || "",
  priceGross: String(item.priceGross),
  priceFinalGross: String(item.priceFinalGross),
  rebatePercent: String(item.rebatePercent || 0),
  stockWarehouse1: String(item.stockWarehouse1),
  stockTotal: String(item.stockTotal),
  isActive: item.isActive,
  isExported: item.isExported,
  landingFeatured: Boolean(item.landingFeatured),
  landingPriority: item.landingPriority == null ? "" : String(item.landingPriority),
});

const normalizeTab = (value: string | null | undefined): TabKey => {
  if (value === "landing") return "landing";
  if (value === "akcije") return "akcije";
  return "products";
};

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const cardImage = (item: CatalogProduct) => item.coverImage || item.images?.[0] || "/img/odela2.jpg";

export default function AdminWebshopPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabKey>("products");

  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [saleItems, setSaleItems] = useState<CatalogProduct[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [categoryRegistry, setCategoryRegistry] = useState<CatalogCategory[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ProductDraft>>({});
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 30, total: 0, totalPages: 1 });

  const [createDraft, setCreateDraft] = useState<CreateDraft>(defaultCreateDraft);
  const [createImages, setCreateImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [inStock, setInStock] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [exportOnly, setExportOnly] = useState(false);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [landingOnly, setLandingOnly] = useState(false);

  const [saleQ, setSaleQ] = useState("");
  const [saleOnSaleOnly, setSaleOnSaleOnly] = useState(true);
  const [promotionRules, setPromotionRules] = useState<PromotionRule[]>([]);
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft>(defaultPromotionDraft);
  const [loadingPromotionRules, setLoadingPromotionRules] = useState(false);
  const [savingPromotionRule, setSavingPromotionRule] = useState(false);
  const [recomputingPromotions, setRecomputingPromotions] = useState(false);

  const [bulkRebate, setBulkRebate] = useState("");
  const [bulkPriceDelta, setBulkPriceDelta] = useState("");
  const [bulkStockDelta, setBulkStockDelta] = useState("");
  const [bulkActive, setBulkActive] = useState<"" | "1" | "0">("");
  const [bulkExported, setBulkExported] = useState<"" | "1" | "0">("");

  const [editorId, setEditorId] = useState<number | null>(null);
  const [saleEditorId, setSaleEditorId] = useState<number | null>(null);

  const [landingSettings, setLandingSettings] = useState<LandingSettings>(defaultLandingSettings);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [savingLanding, setSavingLanding] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState<"left" | "right" | null>(null);
  const [landingProductQuery, setLandingProductQuery] = useState("");
  const [landingProductResults, setLandingProductResults] = useState<CatalogProduct[]>([]);
  const [landingProductsLoading, setLandingProductsLoading] = useState(false);
  const [landingPickerValues, setLandingPickerValues] =
    useState<Record<LandingProductSectionKey, string>>(defaultLandingPickerValue);

  const [loading, setLoading] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[Number(id)]).map(Number), [selected]);
  const categories = useMemo(() => {
    const merged = new Map<number, CatalogCategory>();
    for (const category of [...catalogCategories, ...categoryRegistry]) {
      merged.set(category.id, {
        id: category.id,
        name: category.name,
        path: category.path || [category.name],
      });
    }
    return Array.from(merged.values()).sort((a, b) => a.path.join(" / ").localeCompare(b.path.join(" / "), "sr"));
  }, [catalogCategories, categoryRegistry]);
  const landingProductMap = useMemo(() => {
    const map = new Map<number, CatalogProduct>();
    for (const item of [...landingProductResults, ...items]) {
      if (!map.has(item.legacyId)) map.set(item.legacyId, item);
    }
    return map;
  }, [items, landingProductResults]);

  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(normalizeTab(params.get("tab")));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const changeTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    if (tab === "products") params.delete("tab");
    else params.set("tab", tab);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const updateDraft = (legacyId: number, patch: Partial<ProductDraft>) => {
    setDrafts((prev) => {
      const current = prev[legacyId];
      if (!current) return prev;
      return { ...prev, [legacyId]: { ...current, ...patch } };
    });
  };

  const updateSalePricingDraft = (item: CatalogProduct, field: "priceFinalGross" | "rebatePercent", value: string) => {
    if (field === "rebatePercent") {
      const rebate = toNumberOrNull(value);
      if (rebate == null) {
        updateDraft(item.legacyId, { rebatePercent: value });
        return;
      }
      const nextFinal = computeSalePriceFromRebate(item.priceGross, rebate);
      updateDraft(item.legacyId, {
        rebatePercent: toInputNumber(clampPercent(rebate)),
        priceFinalGross: toInputNumber(nextFinal),
      });
      return;
    }

    const finalPrice = toNumberOrNull(value);
    if (finalPrice == null) {
      updateDraft(item.legacyId, { priceFinalGross: value });
      return;
    }
    const safeFinal = Math.max(0, finalPrice);
    const nextRebate = computeRebateFromSalePrice(item.priceGross, safeFinal);
    updateDraft(item.legacyId, {
      priceFinalGross: toInputNumber(safeFinal),
      rebatePercent: toInputNumber(nextRebate),
    });
  };

  const loadProducts = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pagination.pageSize));
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", categoryId);
      if (inStock) params.set("inStock", "1");
      if (activeOnly) params.set("activeOnly", "1");
      if (exportOnly) params.set("exportOnly", "1");
      if (onSaleOnly) params.set("onSaleOnly", "1");

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load failed");
        return;
      }

      const nextItems = (json.data || []) as CatalogProduct[];
      setItems(landingOnly ? nextItems.filter((item) => item.landingFeatured) : nextItems);
      setCatalogCategories((json.categories || []) as CatalogCategory[]);
      setPagination((json.pagination || pagination) as Pagination);
      setSelected({});
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of nextItems) next[item.legacyId] = toDraft(item);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryRegistry = async () => {
    try {
      const res = await fetch("/api/admin/webshop/categories");
      const json = await res.json();
      if (!json?.success) return;
      setCategoryRegistry(
        ((json.data || []) as Array<{ id: number; name: string; path: string[] }>).map((item) => ({
          id: item.id,
          name: item.name,
          path: item.path || [item.name],
        })),
      );
    } catch {
      // Best-effort helper data for category dropdowns.
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "120");
      if (saleQ.trim()) params.set("q", saleQ.trim());
      if (saleOnSaleOnly) params.set("onSaleOnly", "1");

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load failed");
        return;
      }

      const rows = (json.data || []) as CatalogProduct[];
      setSaleItems(rows);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of rows) next[item.legacyId] = toDraft(item);
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoadingSales(false);
    }
  };

  const loadPromotionRules = async () => {
    setLoadingPromotionRules(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/rules");
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Load promotion rules failed");
        return;
      }
      setPromotionRules((json.data || []) as PromotionRule[]);
    } catch (e: any) {
      setError(e?.message || "Load promotion rules failed");
    } finally {
      setLoadingPromotionRules(false);
    }
  };

  const createPromotion = async () => {
    const name = promotionDraft.name.trim();
    const discountValue = toNumberOrNull(promotionDraft.discountValue);
    if (!name || discountValue == null) {
      setError("Unesi naziv pravila i vrednost popusta.");
      return;
    }

    const payload = {
      name,
      isActive: promotionDraft.isActive,
      scopeType: promotionDraft.scopeType,
      scopeValues: parseScopeValuesText(promotionDraft.scopeType, promotionDraft.scopeValuesText),
      discountType: promotionDraft.discountType,
      discountValue,
      priority: toNumberOrNull(promotionDraft.priority) ?? 0,
      startAt: toIsoFromLocal(promotionDraft.startAt),
      endAt: toIsoFromLocal(promotionDraft.endAt),
    };

    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Create promotion rule failed");
        return;
      }
      setPromotionDraft(defaultPromotionDraft);
      setNotice("Promo pravilo je kreirano.");
      await loadPromotionRules();
    } catch (e: any) {
      setError(e?.message || "Create promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const patchPromotionRule = async (ruleId: string, patch: Record<string, unknown>, successMessage: string) => {
    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/webshop/promotions/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Patch promotion rule failed");
        return;
      }
      setNotice(successMessage);
      await loadPromotionRules();
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Patch promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const removePromotionRule = async (ruleId: string) => {
    setSavingPromotionRule(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/webshop/promotions/rules/${ruleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Delete promotion rule failed");
        return;
      }
      setNotice("Promo pravilo je obrisano.");
      await loadPromotionRules();
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Delete promotion rule failed");
    } finally {
      setSavingPromotionRule(false);
    }
  };

  const recomputePromotions = async () => {
    setRecomputingPromotions(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/promotions/recompute", {
        method: "POST",
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Recompute failed");
        return;
      }
      setNotice(`Primena izracunata. Aktivnih pravila: ${json.activeRules || 0}, pogodjeno proizvoda: ${json.impactedProducts || 0}.`);
      await loadSales();
    } catch (e: any) {
      setError(e?.message || "Recompute failed");
    } finally {
      setRecomputingPromotions(false);
    }
  };

  const loadLanding = async () => {
    setLoadingLanding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings");
      const json = await res.json();
      if (!json?.success || !json?.settings) {
        setError(json?.message || "Load failed");
        return;
      }
      const loaded = { ...defaultLandingSettings, ...(json.settings as LandingSettings) };
      setLandingSettings({
        ...loaded,
        heroStripProductIds: normalizeLegacyIdList(loaded.heroStripProductIds, limitForLandingSection("heroStripProductIds")),
        highlightedProductIds: normalizeLegacyIdList(loaded.highlightedProductIds, limitForLandingSection("highlightedProductIds")),
        popularProductIds: normalizeLegacyIdList(loaded.popularProductIds, limitForLandingSection("popularProductIds")),
        arrivalsProductIds: normalizeLegacyIdList(loaded.arrivalsProductIds, limitForLandingSection("arrivalsProductIds")),
        saleProductIds: normalizeLegacyIdList(loaded.saleProductIds, limitForLandingSection("saleProductIds")),
        trendingProductIds: normalizeLegacyIdList(loaded.trendingProductIds, limitForLandingSection("trendingProductIds")),
      });
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoadingLanding(false);
    }
  };

  const loadLandingProducts = async (queryValue = landingProductQuery) => {
    setLandingProductsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "60");
      params.set("activeOnly", "1");
      params.set("exportOnly", "1");
      const qValue = queryValue.trim();
      if (qValue) params.set("q", qValue);

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) return;
      setLandingProductResults((json.data || []) as CatalogProduct[]);
    } catch {
      // Intentionally silent to avoid blocking landing form edits.
    } finally {
      setLandingProductsLoading(false);
    }
  };

  const limitForLandingSection = (key: LandingProductSectionKey) =>
    landingSectionConfig.find((section) => section.key === key)?.limit ?? 24;

  const replaceLandingSectionIds = (key: LandingProductSectionKey, nextIds: unknown) => {
    const limit = limitForLandingSection(key);
    const normalized = normalizeLegacyIdList(nextIds, limit);
    setLandingSettings((prev) => ({ ...prev, [key]: normalized }));
  };

  const moveLandingSectionId = (key: LandingProductSectionKey, from: number, to: number) => {
    if (from < 0 || to < 0) return;
    setLandingSettings((prev) => {
      const current = [...prev[key]];
      if (from >= current.length || to >= current.length) return prev;
      const [picked] = current.splice(from, 1);
      current.splice(to, 0, picked);
      return { ...prev, [key]: current };
    });
  };

  const removeLandingSectionId = (key: LandingProductSectionKey, id: number) => {
    setLandingSettings((prev) => ({ ...prev, [key]: prev[key].filter((value) => value !== id) }));
  };

  const addLandingSectionId = (key: LandingProductSectionKey, idValue: string) => {
    const id = Number(idValue);
    if (!Number.isFinite(id) || id <= 0) return;
    const limit = limitForLandingSection(key);
    setLandingSettings((prev) => {
      const current = prev[key];
      if (current.includes(id) || current.length >= limit) return prev;
      return { ...prev, [key]: [...current, id] };
    });
    setLandingPickerValues((prev) => ({ ...prev, [key]: "" }));
  };

  useEffect(() => {
    void loadProducts(1);
    void loadCategoryRegistry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "landing") {
      void loadLanding();
      void loadLandingProducts("");
    }
    if (activeTab === "akcije") {
      void loadSales();
      void loadPromotionRules();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const saveProduct = async (legacyId: number) => {
    const draft = drafts[legacyId];
    if (!draft) return;

    setSavingId(legacyId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legacyId,
          name: draft.name,
          brand: draft.brand || null,
          priceGross: toNumberOrNull(draft.priceGross),
          priceFinalGross: toNumberOrNull(draft.priceFinalGross),
          rebatePercent: toNumberOrNull(draft.rebatePercent),
          stockWarehouse1: toNumberOrNull(draft.stockWarehouse1),
          stockTotal: toNumberOrNull(draft.stockTotal),
          isActive: draft.isActive,
          isExported: draft.isExported,
          landingFeatured: draft.landingFeatured,
          landingPriority: draft.landingPriority.trim() ? toNumberOrNull(draft.landingPriority) : null,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Save failed");
        return;
      }
      setNotice(`Sacuvano #${legacyId}`);
      if (activeTab === "akcije") await loadSales();
      else await loadProducts(pagination.page);
    } finally {
      setSavingId(null);
    }
  };

  const createProduct = async () => {
    if (!createDraft.sku.trim() || !createDraft.name.trim()) {
      setError("SKU i naziv su obavezni.");
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const category = categories.find((c) => String(c.id) === createDraft.categoryId);
      const res = await fetch("/api/admin/webshop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          product: {
            sku: createDraft.sku,
            name: createDraft.name,
            categoryId: category?.id ?? null,
            categoryName: category?.name ?? null,
            categoryPath: category?.path ?? null,
            brand: createDraft.brand || null,
            priceGross: toNumberOrNull(createDraft.priceGross) ?? 0,
            priceFinalGross: toNumberOrNull(createDraft.priceFinalGross) ?? 0,
            rebatePercent: toNumberOrNull(createDraft.rebatePercent) ?? 0,
            taxPercent: toNumberOrNull(createDraft.taxPercent) ?? 20,
            stockWarehouse1: toNumberOrNull(createDraft.stockWarehouse1) ?? 0,
            stockTotal: toNumberOrNull(createDraft.stockTotal) ?? 0,
            coverImage: createImages[0] || null,
            images: createImages,
            isActive: createDraft.isActive,
            isExported: createDraft.isExported,
            landingFeatured: createDraft.landingFeatured,
            landingPriority: createDraft.landingPriority.trim() ? toNumberOrNull(createDraft.landingPriority) : null,
          },
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Create failed");
        return;
      }
      setNotice(`Kreiran #${json.legacyId}`);
      setCreateDraft(defaultCreateDraft);
      setCreateImages([]);
      await loadProducts(1);
    } finally {
      setCreating(false);
    }
  };

  const uploadCreateImages = async (files: FileList | null) => {
    const list = Array.from(files || []);
    if (!list.length) return;

    setUploadingImages(true);
    setError(null);
    setNotice(null);

    try {
      const fd = new FormData();
      for (const file of list) fd.append("files", file);
      const res = await fetch("/api/admin/webshop/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Image upload failed");
        return;
      }
      const urls = Array.isArray(json.urls) ? (json.urls as string[]) : [];
      if (!urls.length) {
        setError("Upload nije vratio URL.");
        return;
      }
      setCreateImages((prev) => [...prev, ...urls.filter((url) => !prev.includes(url))]);
      setNotice(`${urls.length} slika uploadovano.`);
    } catch (e: any) {
      setError(e?.message || "Image upload failed");
    } finally {
      setUploadingImages(false);
    }
  };

  const applyBulk = async () => {
    if (!selectedIds.length) {
      setError("Selektuj proizvode.");
      return;
    }

    const priceDelta = toNumberOrNull(bulkPriceDelta);
    const stockDelta = toNumberOrNull(bulkStockDelta);
    const rebate = toNumberOrNull(bulkRebate);

    const updates = selectedIds.map((legacyId) => {
      const row = items.find((item) => item.legacyId === legacyId);
      if (!row) return { legacyId };
      const update: Record<string, unknown> = { legacyId };
      if (bulkActive !== "") update.isActive = bulkActive === "1";
      if (bulkExported !== "") update.isExported = bulkExported === "1";
      if (priceDelta != null) update.priceFinalGross = Math.max(0, Number((row.priceFinalGross * (1 + priceDelta / 100)).toFixed(2)));
      if (rebate != null) {
        const safeRebate = Math.max(0, Math.min(100, rebate));
        update.rebatePercent = safeRebate;
        update.priceFinalGross = Math.max(0, Number((row.priceGross * (1 - safeRebate / 100)).toFixed(2)));
      }
      if (stockDelta != null) {
        update.stockWarehouse1 = Math.max(0, Number((row.stockWarehouse1 + stockDelta).toFixed(3)));
        update.stockTotal = Math.max(0, Number((row.stockTotal + stockDelta).toFixed(3)));
      }
      return update;
    });

    setBulkSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk", updates }),
      });
      const json = await res.json();
      if (!json?.success && !json?.partial) {
        setError(json?.message || "Bulk failed");
        return;
      }
      setNotice("Bulk izmena sacuvana.");
      setBulkRebate("");
      setBulkPriceDelta("");
      setBulkStockDelta("");
      setBulkActive("");
      setBulkExported("");
      await loadProducts(pagination.page);
    } finally {
      setBulkSaving(false);
    }
  };

  const saveLanding = async (patch?: Partial<LandingSettings>, successMessage = "Landing settings sacuvan.") => {
    const payload = patch ? { ...landingSettings, ...patch } : landingSettings;
    setSavingLanding(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Save failed");
        return;
      }
      setLandingSettings((prev) => ({ ...prev, ...(json.settings || payload) }));
      setNotice(successMessage);
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSavingLanding(false);
    }
  };

  const uploadBannerImage = async (side: "left" | "right", files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setUploadingBanner(side);
    setError(null);
    setNotice(null);

    try {
      const fd = new FormData();
      fd.append("files", file);
      const uploadRes = await fetch("/api/admin/webshop/media", {
        method: "POST",
        body: fd,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadJson?.success) {
        setError(uploadJson?.message || "Upload failed");
        return;
      }
      const url = Array.isArray(uploadJson.urls) ? String(uploadJson.urls[0] || "") : "";
      if (!url) {
        setError("Upload nije vratio URL.");
        return;
      }

      const patch: Partial<LandingSettings> = side === "left" ? { bannerLeftImage: url } : { bannerRightImage: url };

      setLandingSettings((prev) => ({ ...prev, ...patch }));
      await saveLanding(patch, side === "left" ? "Levi banner sacuvan." : "Desni banner sacuvan.");
    } catch (e: any) {
      setError(e?.message || "Upload failed");
    } finally {
      setUploadingBanner(null);
    }
  };

  const currentEditorItem = items.find((item) => item.legacyId === editorId) || null;
  const currentSaleEditorItem = saleItems.find((item) => item.legacyId === saleEditorId) || null;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Web Shop Hub</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Catalog + Landing + Akcije</h1>
        <p className="mt-1 text-sm text-slate-600">Mobile-first upravljanje, desktop power view i centralizovan workflow.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => changeTab(tab.key)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.12em]">{tab.label}</p>
                <p className="mt-1 text-xs text-slate-500">{tab.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {activeTab === "products" ? (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Kako koristiti - Proizvodi</p>
            <p className="mt-1">
              `Regularna cena` je puna cena proizvoda. `Prodajna cena` je trenutna cena koju kupac vidi.
              `Popust %` je informativni procenat akcije. `Lager magacin 1` i `Ukupan lager` su kolicine.
              `Landing featured` i `Landing prioritet` odredjuju redosled na home stranici.
            </p>
          </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Dodavanje proizvoda</p>
            <Link href="/admin/categories" className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
              Upravljaj kategorijama
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
              <input value={createDraft.sku} onChange={(e) => setCreateDraft((p) => ({ ...p, sku: e.target.value }))} placeholder="SKU*" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.name} onChange={(e) => setCreateDraft((p) => ({ ...p, name: e.target.value }))} placeholder="Naziv proizvoda*" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <select value={createDraft.categoryId} onChange={(e) => setCreateDraft((p) => ({ ...p, categoryId: e.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Bez kategorije</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.path.join(" / ")}</option>
                ))}
              </select>
              <input value={createDraft.brand} onChange={(e) => setCreateDraft((p) => ({ ...p, brand: e.target.value }))} placeholder="Brend (opciono)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.priceGross} onChange={(e) => setCreateDraft((p) => ({ ...p, priceGross: e.target.value }))} placeholder="Regularna cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.priceFinalGross} onChange={(e) => setCreateDraft((p) => ({ ...p, priceFinalGross: e.target.value }))} placeholder="Prodajna cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.rebatePercent} onChange={(e) => setCreateDraft((p) => ({ ...p, rebatePercent: e.target.value }))} placeholder="Popust % (0-100)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.taxPercent} onChange={(e) => setCreateDraft((p) => ({ ...p, taxPercent: e.target.value }))} placeholder="PDV % (npr 20)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.stockWarehouse1} onChange={(e) => setCreateDraft((p) => ({ ...p, stockWarehouse1: e.target.value }))} placeholder="Lager magacin 1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={createDraft.stockTotal} onChange={(e) => setCreateDraft((p) => ({ ...p, stockTotal: e.target.value }))} placeholder="Ukupan lager" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />

              <div className="rounded-xl border border-slate-200 p-3 md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Slike proizvoda</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    void uploadCreateImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  className="mt-2 block w-full text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-500">Telefon podrzan: galerija i direktno slikanje.</p>
                {uploadingImages ? <p className="mt-2 text-xs text-slate-500">Upload u toku...</p> : null}
                {createImages.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {createImages.map((url, idx) => (
                      <div key={url} className="rounded border border-slate-200 p-1">
                        <Image src={url} alt={`Upload ${idx + 1}`} width={180} height={80} className="h-20 w-full rounded object-cover" />
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setCreateImages((prev) => {
                                if (idx === 0) return prev;
                                const next = [...prev];
                                const [picked] = next.splice(idx, 1);
                                next.unshift(picked);
                                return next;
                              })
                            }
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                              idx === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                            }`}
                          >
                            {idx === 0 ? "Cover slika" : "Postavi cover"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateImages((prev) => prev.filter((item) => item !== url))}
                            className="rounded border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700"
                          >
                            Ukloni
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createDraft.isActive} onChange={(e) => setCreateDraft((p) => ({ ...p, isActive: e.target.checked }))} />Aktivan (vidljiv na sajtu)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createDraft.isExported} onChange={(e) => setCreateDraft((p) => ({ ...p, isExported: e.target.checked }))} />Export (sinhronizacija)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={createDraft.landingFeatured} onChange={(e) => setCreateDraft((p) => ({ ...p, landingFeatured: e.target.checked }))} />Istakni na landing-u</label>
              <input value={createDraft.landingPriority} onChange={(e) => setCreateDraft((p) => ({ ...p, landingPriority: e.target.value }))} placeholder="Landing prioritet (1,2,3...)" className="w-56 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={createProduct} disabled={creating} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{creating ? "Kreiranje..." : "Kreiraj proizvod"}</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-7">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pretraga po SKU / sifri / nazivu" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <option value="">Sve kategorije</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.path.join(" / ")}</option>
                ))}
              </select>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />Na stanju</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />Samo aktivni</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={exportOnly} onChange={(e) => setExportOnly(e.target.checked)} />Samo export</label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={onSaleOnly} onChange={(e) => setOnSaleOnly(e.target.checked)} />Samo akcija</label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={landingOnly} onChange={(e) => setLandingOnly(e.target.checked)} />Samo landing featured</label>
              <button onClick={() => loadProducts(1)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Primeni filtere</button>
              <button onClick={() => loadProducts(pagination.page)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Osvezi</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Bulk akcije ({selectedIds.length} selektovano)</p>
            <p className="mb-3 text-xs text-slate-500">`Promena cene %` menja prodajnu cenu za procenat. `Popust %` postavlja akciju. `Promena lagera` dodaje/oduzima kolicinu.</p>
            <div className="grid gap-3 md:grid-cols-6">
              <select value={bulkActive} onChange={(e) => setBulkActive(e.target.value as "" | "1" | "0")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Aktivnost bez promene</option><option value="1">Postavi aktivno</option><option value="0">Postavi neaktivno</option></select>
              <select value={bulkExported} onChange={(e) => setBulkExported(e.target.value as "" | "1" | "0")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Export bez promene</option><option value="1">Ukljuci export</option><option value="0">Iskljuci export</option></select>
              <input value={bulkPriceDelta} onChange={(e) => setBulkPriceDelta(e.target.value)} placeholder="Promena cene %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={bulkRebate} onChange={(e) => setBulkRebate(e.target.value)} placeholder="Akcija %" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={bulkStockDelta} onChange={(e) => setBulkStockDelta(e.target.value)} placeholder="Promena lagera" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={applyBulk} disabled={bulkSaving} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{bulkSaving ? "Cuvanje..." : "Primeni bulk izmene"}</button>
            </div>
          </div>

          {loading ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}

          <div className="grid gap-3 lg:hidden">
            {items.map((item) => {
              const draft = drafts[item.legacyId];
              return (
                <article key={`m-${item.legacyId}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex gap-3">
                    <Image src={cardImage(item)} alt={item.name} width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">#{item.legacyId} / {item.sku}</p>
                      <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-xs text-slate-600">{item.categories[0]?.path.join(" / ") || "Bez kategorije"}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <span className="rounded-full border border-slate-200 px-2 py-1">{formatRsd(item.priceFinalGross)}</span>
                        <span className="rounded-full border border-slate-200 px-2 py-1">Lager {item.stockWarehouse1}</span>
                        {item.landingFeatured ? <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Landing</span> : null}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button onClick={() => setEditorId(item.legacyId)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Izmeni</button>
                    <button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
                    <Link href={`/web-shop/${item.legacyId}`} target="_blank" className="rounded-lg border border-slate-200 px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">Pregled</Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-2"><input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={(e) => {
                      if (!e.target.checked) return setSelected({});
                      const map: Record<number, boolean> = {};
                      for (const i of items) map[i.legacyId] = true;
                      setSelected(map);
                    }} /></th>
                    <th className="px-2 py-2">ID / SKU</th>
                    <th className="px-2 py-2">Naziv</th>
                    <th className="px-2 py-2">Kategorija</th>
                    <th className="px-2 py-2">Prodajna / Regularna</th>
                    <th className="px-2 py-2">Lager</th>
                    <th className="px-2 py-2">Flags</th>
                    <th className="px-2 py-2">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const draft = drafts[item.legacyId];
                    return (
                      <tr key={item.legacyId} className="border-b border-slate-100 align-top">
                        <td className="px-2 py-2"><input type="checkbox" checked={Boolean(selected[item.legacyId])} onChange={(e) => setSelected((prev) => ({ ...prev, [item.legacyId]: e.target.checked }))} /></td>
                        <td className="px-2 py-2 text-xs font-mono">#{item.legacyId}<br />{item.sku}</td>
                        <td className="px-2 py-2"><input value={draft?.name || ""} onChange={(e) => updateDraft(item.legacyId, { name: e.target.value })} className="w-64 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2 text-xs">{item.categories[0]?.path.join(" / ") || "-"}</td>
                        <td className="px-2 py-2"><input value={draft?.priceFinalGross || ""} onChange={(e) => updateDraft(item.legacyId, { priceFinalGross: e.target.value })} className="mb-1 w-28 rounded border border-slate-200 px-2 py-1 text-xs" /><input value={draft?.priceGross || ""} onChange={(e) => updateDraft(item.legacyId, { priceGross: e.target.value })} className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><input value={draft?.stockWarehouse1 || ""} onChange={(e) => updateDraft(item.legacyId, { stockWarehouse1: e.target.value })} className="mb-1 w-24 rounded border border-slate-200 px-2 py-1 text-xs" /><input value={draft?.stockTotal || ""} onChange={(e) => updateDraft(item.legacyId, { stockTotal: e.target.value })} className="w-24 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2 text-xs"><label className="mb-1 flex items-center gap-2"><input type="checkbox" checked={Boolean(draft?.isActive)} onChange={(e) => updateDraft(item.legacyId, { isActive: e.target.checked })} />Aktivan</label><label className="mb-1 flex items-center gap-2"><input type="checkbox" checked={Boolean(draft?.isExported)} onChange={(e) => updateDraft(item.legacyId, { isExported: e.target.checked })} />Export</label><label className="mb-1 flex items-center gap-2"><input type="checkbox" checked={Boolean(draft?.landingFeatured)} onChange={(e) => updateDraft(item.legacyId, { landingFeatured: e.target.checked })} />Landing</label></td>
                        <td className="px-2 py-2"><div className="flex flex-col gap-1"><button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button><button onClick={() => setEditorId(item.legacyId)} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Otvori editor</button><Link href={`/web-shop/${item.legacyId}`} target="_blank" className="rounded border border-slate-200 px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">Pregled</Link></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">Page {pagination.page} / {pagination.totalPages} ({pagination.total})</p>
              <div className="flex gap-2">
                <button onClick={() => loadProducts(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1 || loading} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 disabled:opacity-50">Prethodna</button>
                <button onClick={() => loadProducts(Math.min(pagination.totalPages, pagination.page + 1))} disabled={pagination.page >= pagination.totalPages || loading} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 disabled:opacity-50">Sledeca</button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "landing" ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hero</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input value={landingSettings.heroEyebrow} onChange={(e) => setLandingSettings((p) => ({ ...p, heroEyebrow: e.target.value }))} placeholder="Eyebrow" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroTitleLine1} onChange={(e) => setLandingSettings((p) => ({ ...p, heroTitleLine1: e.target.value }))} placeholder="Hero line 1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroTitleLine2} onChange={(e) => setLandingSettings((p) => ({ ...p, heroTitleLine2: e.target.value }))} placeholder="Hero line 2" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroPrimaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, heroPrimaryCtaLabel: e.target.value }))} placeholder="Primary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroPrimaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, heroPrimaryCtaHref: e.target.value }))} placeholder="Primary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroSecondaryCtaLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, heroSecondaryCtaLabel: e.target.value }))} placeholder="Secondary CTA label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={landingSettings.heroSecondaryCtaHref} onChange={(e) => setLandingSettings((p) => ({ ...p, heroSecondaryCtaHref: e.target.value }))} placeholder="Secondary CTA href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Banneri (upload only)</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Levi banner</p>
                <Image src={landingSettings.bannerLeftImage} alt="Levi banner" width={690} height={330} className="mt-2 h-36 w-full rounded-lg object-cover" />
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.bannerLeftTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftTitle: e.target.value }))} placeholder="Title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerLeftButtonLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftButtonLabel: e.target.value }))} placeholder="Button label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerLeftHref} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerLeftHref: e.target.value }))} placeholder="Href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadBannerImage("left", e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingBanner === "left" ? "Uploading..." : "Upload / replace"}
                  </label>
                  <button onClick={() => setLandingSettings((p) => ({ ...p, bannerLeftImage: defaultLandingSettings.bannerLeftImage }))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Reset default</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Desni banner</p>
                <Image src={landingSettings.bannerRightImage} alt="Desni banner" width={690} height={330} className="mt-2 h-36 w-full rounded-lg object-cover" />
                <div className="mt-3 grid gap-2">
                  <input value={landingSettings.bannerRightTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightTitle: e.target.value }))} placeholder="Title" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerRightButtonLabel} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightButtonLabel: e.target.value }))} placeholder="Button label" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                  <input value={landingSettings.bannerRightHref} onChange={(e) => setLandingSettings((p) => ({ ...p, bannerRightHref: e.target.value }))} placeholder="Href" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        void uploadBannerImage("right", e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    {uploadingBanner === "right" ? "Uploading..." : "Upload / replace"}
                  </label>
                  <button onClick={() => setLandingSettings((p) => ({ ...p, bannerRightImage: defaultLandingSettings.bannerRightImage }))} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Reset default</button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Sale sekcija</p>
            <div className="grid gap-3 md:grid-cols-6">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2">
                <input type="checkbox" checked={landingSettings.showSaleSection} onChange={(e) => setLandingSettings((p) => ({ ...p, showSaleSection: e.target.checked }))} />
                Prikazi akcije sekciju
              </label>
              <input value={landingSettings.saleSectionTitle} onChange={(e) => setLandingSettings((p) => ({ ...p, saleSectionTitle: e.target.value }))} placeholder="Naslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <input value={landingSettings.saleSectionSubtitle} onChange={(e) => setLandingSettings((p) => ({ ...p, saleSectionSubtitle: e.target.value }))} placeholder="Podnaslov" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Select proizvoda po sekcijama</p>
              <p className="text-xs text-slate-500">Ako je sekcija prazna, home koristi automatski fallback redosled.</p>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <input
                value={landingProductQuery}
                onChange={(e) => setLandingProductQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void loadLandingProducts(landingProductQuery);
                  }
                }}
                placeholder="Pretraga po SKU / nazivu / ID"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-4"
              />
              <button
                onClick={() => void loadLandingProducts(landingProductQuery)}
                disabled={landingProductsLoading}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
              >
                {landingProductsLoading ? "Ucitavanje..." : "Pronadji proizvode"}
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              {landingSectionConfig.map((section) => {
                const sectionIds = landingSettings[section.key];
                const csvValue = sectionIds.join(",");
                const candidates = landingProductResults.filter((item) => !sectionIds.includes(item.legacyId));
                return (
                  <div key={section.key} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                        <p className="text-xs text-slate-500">{section.description}</p>
                      </div>
                      <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {sectionIds.length}/{section.limit}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                      <input
                        value={csvValue}
                        onChange={(e) => replaceLandingSectionIds(section.key, parseLegacyIdCsv(e.target.value, section.limit))}
                        placeholder="Legacy ID lista: 101,205,333"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                      />
                      <select
                        value={landingPickerValues[section.key]}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLandingPickerValues((prev) => ({ ...prev, [section.key]: value }));
                          if (value) addLandingSectionId(section.key, value);
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Dodaj iz pretrage...</option>
                        {candidates.map((item) => (
                          <option key={`${section.key}-${item.legacyId}`} value={item.legacyId}>
                            #{item.legacyId} / {item.sku} - {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {sectionIds.length === 0 ? (
                        <p className="text-xs text-slate-500">Nema manuelno odabranih proizvoda.</p>
                      ) : null}
                      {sectionIds.map((id, index) => {
                        const product = landingProductMap.get(id);
                        return (
                          <div key={`${section.key}-${id}`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                            <span className="font-semibold text-slate-700">
                              #{id}
                              {product ? ` / ${product.sku}` : ""}
                            </span>
                            <span className="max-w-[220px] truncate text-slate-500">{product?.name || "Nepoznat proizvod"}</span>
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index - 1)}
                              disabled={index === 0}
                              className="rounded border border-slate-200 px-1 text-[10px] text-slate-700 disabled:opacity-40"
                            >
                              UP
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index + 1)}
                              disabled={index === sectionIds.length - 1}
                              className="rounded border border-slate-200 px-1 text-[10px] text-slate-700 disabled:opacity-40"
                            >
                              DOWN
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLandingSectionId(section.key, id)}
                              className="rounded border border-rose-200 px-1 text-[10px] text-rose-700"
                            >
                              x
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-600">Landing autosave nije ukljucen. Hero, baneri i sekcije proizvoda se cuvaju na klik.</p>
              <div className="flex gap-2">
                <button onClick={loadLanding} disabled={loadingLanding || savingLanding} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Osvezi</button>
                <button onClick={() => saveLanding()} disabled={savingLanding || loadingLanding} className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{savingLanding ? "Cuvanje..." : "Sacuvaj landing"}</button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === "akcije" ? (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold uppercase tracking-[0.12em]">Kako koristiti - Akcije</p>
            <p className="mt-1">
              `Stara cena` je redovna cena. Unesi ili `Akcijsku cenu` ili `Popust %`, drugo polje se racuna automatski.
              Posle izmene klikni `Sacuvaj` da bi se cena prikazala na webshop-u.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Smart pravila akcija</p>
              <button
                onClick={recomputePromotions}
                disabled={recomputingPromotions}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700"
              >
                {recomputingPromotions ? "Racunanje..." : "Primeni sada"}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Pravilo menja cenu na storefront-u po prioritetu. Veci prioritet ima prednost.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <input
                value={promotionDraft.name}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Naziv pravila*"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
              />
              <select
                value={promotionDraft.scopeType}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, scopeType: e.target.value as PromotionScopeType }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="all">Scope: Sve</option>
                <option value="category">Scope: Kategorije</option>
                <option value="brand">Scope: Brendovi</option>
                <option value="product">Scope: Proizvodi</option>
              </select>
              <input
                value={promotionDraft.scopeValuesText}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, scopeValuesText: e.target.value }))}
                placeholder={
                  promotionDraft.scopeType === "all"
                    ? "Nije potrebno"
                    : promotionDraft.scopeType === "category"
                      ? "ID kategorija: 12,45"
                      : promotionDraft.scopeType === "product"
                        ? "Legacy ID proizvoda: 101,205"
                        : "Brendovi: hugo,boss"
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                disabled={promotionDraft.scopeType === "all"}
              />
              <select
                value={promotionDraft.discountType}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, discountType: e.target.value as PromotionDiscountType }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="percent">Popust %</option>
                <option value="fixed">Fiksni iznos (RSD)</option>
              </select>
              <input
                value={promotionDraft.discountValue}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, discountValue: e.target.value }))}
                placeholder={promotionDraft.discountType === "percent" ? "Popust % (0-100)" : "Iznos (RSD)"}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={promotionDraft.priority}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, priority: e.target.value }))}
                placeholder="Prioritet (0+)"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={promotionDraft.startAt}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, startAt: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={promotionDraft.endAt}
                onChange={(e) => setPromotionDraft((prev) => ({ ...prev, endAt: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={promotionDraft.isActive}
                  onChange={(e) => setPromotionDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Aktivno odmah
              </label>
              <button
                onClick={createPromotion}
                disabled={savingPromotionRule}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700"
              >
                {savingPromotionRule ? "Cuvanje..." : "Dodaj pravilo"}
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {loadingPromotionRules ? <p className="text-xs text-slate-500">Ucitavanje pravila...</p> : null}
              {!loadingPromotionRules && promotionRules.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">Nema pravila. Dodaj prvo smart pravilo.</p>
              ) : null}
              {promotionRules.map((rule) => (
                <article key={rule.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{rule.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {rule.discountType === "percent" ? `${rule.discountValue}%` : `${rule.discountValue} RSD`} | Scope: {rule.scopeType} ({scopeValuesLabel(rule)}) | Prioritet {rule.priority}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Period: {rule.startAt ? new Date(rule.startAt).toLocaleString("sr-RS") : "odmah"} - {rule.endAt ? new Date(rule.endAt).toLocaleString("sr-RS") : "bez kraja"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${
                        rule.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-600"
                      }`}
                    >
                      {rule.isActive ? "Aktivno" : "Pauzirano"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => void patchPromotionRule(rule.id, { isActive: !rule.isActive }, rule.isActive ? "Pravilo je pauzirano." : "Pravilo je aktivirano.")}
                      disabled={savingPromotionRule}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700"
                    >
                      {rule.isActive ? "Pauziraj" : "Aktiviraj"}
                    </button>
                    <button
                      onClick={() => void removePromotionRule(rule.id)}
                      disabled={savingPromotionRule}
                      className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700"
                    >
                      Obrisi
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-6">
              <input value={saleQ} onChange={(e) => setSaleQ(e.target.value)} placeholder="Pretraga SKU / naziva" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-3" />
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"><input type="checkbox" checked={saleOnSaleOnly} onChange={(e) => setSaleOnSaleOnly(e.target.checked)} />Samo proizvodi na akciji</label>
              <button onClick={loadSales} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">Primeni filter</button>
            </div>
          </div>

          {loadingSales ? <p className="text-sm text-slate-500">Ucitavanje...</p> : null}

          <div className="grid gap-3 lg:hidden">
            {saleItems.map((item) => {
              const draft = drafts[item.legacyId];
              return (
                <article key={`sale-${item.legacyId}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">#{item.legacyId} / {item.sku}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-900">{item.name}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-slate-500">Stara cena</p><p className="font-semibold">{formatRsd(item.priceGross)}</p></div>
                    <div><p className="text-slate-500">Akcija cena</p><p className="font-semibold">{formatRsd(item.priceFinalGross)}</p></div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input value={draft?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(item, "priceFinalGross", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Akcijska cena (RSD)" />
                    <input value={draft?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(item, "rebatePercent", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" placeholder="Popust % (0-100)" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
                    <button onClick={() => setSaleEditorId(item.legacyId)} className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Detalji akcije</button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                    <th className="px-2 py-2">ID / SKU</th>
                    <th className="px-2 py-2">Naziv</th>
                    <th className="px-2 py-2">Kategorija</th>
                    <th className="px-2 py-2">Stara cena</th>
                    <th className="px-2 py-2">Akcija cena</th>
                    <th className="px-2 py-2">Popust %</th>
                    <th className="px-2 py-2">Akcija</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((item) => {
                    const draft = drafts[item.legacyId];
                    return (
                      <tr key={`sale-desktop-${item.legacyId}`} className="border-b border-slate-100 align-top">
                        <td className="px-2 py-2 text-xs font-mono">#{item.legacyId}<br />{item.sku}</td>
                        <td className="px-2 py-2">{item.name}</td>
                        <td className="px-2 py-2 text-xs">{item.categories[0]?.path.join(" / ") || "-"}</td>
                        <td className="px-2 py-2">{formatRsd(item.priceGross)}</td>
                        <td className="px-2 py-2"><input value={draft?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(item, "priceFinalGross", e.target.value)} placeholder="RSD" className="w-28 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><input value={draft?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(item, "rebatePercent", e.target.value)} placeholder="%" className="w-20 rounded border border-slate-200 px-2 py-1 text-xs" /></td>
                        <td className="px-2 py-2"><div className="flex gap-2"><button onClick={() => saveProduct(item.legacyId)} disabled={savingId === item.legacyId || !draft} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === item.legacyId ? "Cuvanje..." : "Sacuvaj"}</button><button onClick={() => setSaleEditorId(item.legacyId)} className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">Detalji akcije</button></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {editorId != null && currentEditorItem ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 lg:items-center" onClick={() => setEditorId(null)}>
          <div className="max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-white p-4 shadow-2xl lg:mx-auto lg:max-w-2xl lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Editor proizvoda</p>
                <h2 className="text-lg font-semibold text-slate-900">#{currentEditorItem.legacyId} / {currentEditorItem.sku}</h2>
              </div>
              <button onClick={() => setEditorId(null)} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Zatvori</button>
            </div>

            <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              `Regularna cena` je puna cena, `Prodajna cena` je cena na sajtu. Ako je `Istakni na landing-u` ukljuceno,
              `Landing prioritet` odredjuje redosled prikaza (manji broj = pre).
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <input value={drafts[currentEditorItem.legacyId]?.name || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { name: e.target.value })} placeholder="Naziv" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
              <input value={drafts[currentEditorItem.legacyId]?.brand || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { brand: e.target.value })} placeholder="Brend (opciono)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.landingPriority || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { landingPriority: e.target.value })} placeholder="Landing prioritet (1,2,3...)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.priceGross || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { priceGross: e.target.value })} placeholder="Regularna cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.priceFinalGross || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { priceFinalGross: e.target.value })} placeholder="Prodajna cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.rebatePercent || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { rebatePercent: e.target.value })} placeholder="Popust % (0-100)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.stockWarehouse1 || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { stockWarehouse1: e.target.value })} placeholder="Lager magacin 1" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentEditorItem.legacyId]?.stockTotal || ""} onChange={(e) => updateDraft(currentEditorItem.legacyId, { stockTotal: e.target.value })} placeholder="Ukupan lager" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(drafts[currentEditorItem.legacyId]?.isActive)} onChange={(e) => updateDraft(currentEditorItem.legacyId, { isActive: e.target.checked })} />Aktivan (vidljiv na sajtu)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(drafts[currentEditorItem.legacyId]?.isExported)} onChange={(e) => updateDraft(currentEditorItem.legacyId, { isExported: e.target.checked })} />Export (sinhronizacija)</label>
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(drafts[currentEditorItem.legacyId]?.landingFeatured)} onChange={(e) => updateDraft(currentEditorItem.legacyId, { landingFeatured: e.target.checked })} />Istakni na landing-u</label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link href={`/web-shop/${currentEditorItem.legacyId}`} target="_blank" className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Pregled proizvoda</Link>
              <button onClick={() => setEditorId(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Odustani</button>
              <button onClick={() => void saveProduct(currentEditorItem.legacyId)} disabled={savingId === currentEditorItem.legacyId} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === currentEditorItem.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
            </div>
          </div>
        </div>
      ) : null}

      {saleEditorId != null && currentSaleEditorItem ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-900/45 lg:items-center" onClick={() => setSaleEditorId(null)}>
          <div className="w-full rounded-t-2xl bg-white p-4 shadow-2xl lg:mx-auto lg:max-w-lg lg:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Editor akcije</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{currentSaleEditorItem.name}</h2>
            <p className="text-xs text-slate-500">#{currentSaleEditorItem.legacyId} / {currentSaleEditorItem.sku}</p>
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Mozes uneti `Akcijsku cenu` ili `Popust %`. Drugo polje se automatski uskladjuje.
            </p>

            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><p className="text-xs text-slate-500">Stara cena</p><p className="font-semibold">{formatRsd(currentSaleEditorItem.priceGross)}</p></div>
              <input value={drafts[currentSaleEditorItem.legacyId]?.priceFinalGross || ""} onChange={(e) => updateSalePricingDraft(currentSaleEditorItem, "priceFinalGross", e.target.value)} placeholder="Akcijska cena (RSD)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input value={drafts[currentSaleEditorItem.legacyId]?.rebatePercent || ""} onChange={(e) => updateSalePricingDraft(currentSaleEditorItem, "rebatePercent", e.target.value)} placeholder="Popust % (0-100)" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setSaleEditorId(null)} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">Odustani</button>
              <button onClick={() => void saveProduct(currentSaleEditorItem.legacyId)} disabled={savingId === currentSaleEditorItem.legacyId} className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{savingId === currentSaleEditorItem.legacyId ? "Cuvanje..." : "Sacuvaj"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
