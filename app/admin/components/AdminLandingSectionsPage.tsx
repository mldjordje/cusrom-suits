"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LANDING_PRODUCT_SECTION_CONFIG,
  buildLandingProductSectionMap,
  getLandingProductSectionConfig,
  normalizeLandingCustomSections,
  normalizeLandingProductSections,
  type LandingCustomSection,
  type LandingProductLayout,
  type LandingProductSectionKey,
  type LandingProductSectionState,
} from "@/lib/catalog/landingSections";
import {
  LANDING_FIXED_SECTION_CONFIG,
  applyLandingPageOrder,
  getLandingFixedSectionConfig,
  getOrderedLandingPageEntries,
  normalizeLandingFixedSections,
  type LandingFixedSectionKey,
  type LandingFixedSectionState,
  type LandingPageOrderEntry,
  type LandingPageOrderRef,
} from "@/lib/catalog/landingPageSections";
import AdminLandingProductPickGrid from "@/app/admin/components/AdminLandingProductPickGrid";

type LandingSectionsState = {
  showSaleSection: boolean;
  fixedSections: LandingFixedSectionState[];
  productSections: LandingProductSectionState[];
  customSections: LandingCustomSection[];
  saleSectionTitle: string;
  saleSectionSubtitle: string;
  heroEyebrow: string;
  heroEyebrowEn: string;
  heroTitleLine1: string;
  heroTitleLine1En: string;
  heroTitleLine2: string;
  heroTitleLine2En: string;
  heroPrimaryCtaLabel: string;
  heroPrimaryCtaLabelEn: string;
  heroPrimaryCtaHref: string;
  heroSecondaryCtaLabel: string;
  heroSecondaryCtaLabelEn: string;
  heroSecondaryCtaHref: string;
  heroStripProductIds: number[];
  highlightedProductIds: number[];
  popularProductIds: number[];
  arrivalsProductIds: number[];
  saleProductIds: number[];
  trendingProductIds: number[];
};

type CatalogProduct = {
  legacyId: number;
  sku: string;
  name: string;
  coverImage?: string | null;
};

type LandingDisplaySection = (typeof LANDING_PRODUCT_SECTION_CONFIG)[number] & {
  control: LandingProductSectionState;
  ids: number[];
  displayPosition: number | null;
  names: string[];
};

const defaultPickerValue: Record<LandingProductSectionKey, string> = {
  heroStripProductIds: "",
  highlightedProductIds: "",
  popularProductIds: "",
  arrivalsProductIds: "",
  saleProductIds: "",
  trendingProductIds: "",
};

const defaultState: LandingSectionsState = {
  showSaleSection: true,
  fixedSections: normalizeLandingFixedSections([]),
  productSections: normalizeLandingProductSections([]),
  customSections: [],
  saleSectionTitle: "Aktuelne Akcije",
  saleSectionSubtitle: "",
  heroEyebrow: "Santos & Santorini",
  heroEyebrowEn: "",
  heroTitleLine1: "Nova kolekcija",
  heroTitleLine1En: "",
  heroTitleLine2: "2026",
  heroTitleLine2En: "",
  heroPrimaryCtaLabel: "Web shop",
  heroPrimaryCtaLabelEn: "",
  heroPrimaryCtaHref: "/web-shop",
  heroSecondaryCtaLabel: "Kontakt",
  heroSecondaryCtaLabelEn: "",
  heroSecondaryCtaHref: "/kontakt",
  heroStripProductIds: [],
  highlightedProductIds: [],
  popularProductIds: [],
  arrivalsProductIds: [],
  saleProductIds: [],
  trendingProductIds: [],
};

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

const limitForLandingSection = (key: LandingProductSectionKey) =>
  getLandingProductSectionConfig(key)?.limit ?? 24;

const normalizeLandingState = (value: unknown): LandingSectionsState => {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  let productSections = normalizeLandingProductSections(row.productSections);
  const saleSectionMap = buildLandingProductSectionMap(productSections);
  const saleEnabled = row.productSections == null
    ? row.showSaleSection !== false
    : saleSectionMap.get("saleProductIds")?.enabled !== false;

  productSections = productSections.map((section) =>
    section.key === "saleProductIds" ? { ...section, enabled: saleEnabled } : section,
  );

  return {
    showSaleSection: saleEnabled,
    fixedSections: normalizeLandingFixedSections(row.fixedSections),
    productSections,
    customSections: normalizeLandingCustomSections(row.customSections),
    saleSectionTitle: String(row.saleSectionTitle || defaultState.saleSectionTitle).trim() || defaultState.saleSectionTitle,
    saleSectionSubtitle: String(row.saleSectionSubtitle || "").trim(),
    heroEyebrow: String(row.heroEyebrow || defaultState.heroEyebrow).trim() || defaultState.heroEyebrow,
    heroEyebrowEn: String(row.heroEyebrowEn || "").trim(),
    heroTitleLine1: String(row.heroTitleLine1 || defaultState.heroTitleLine1).trim() || defaultState.heroTitleLine1,
    heroTitleLine1En: String(row.heroTitleLine1En || "").trim(),
    heroTitleLine2: String(row.heroTitleLine2 || "").trim(),
    heroTitleLine2En: String(row.heroTitleLine2En || "").trim(),
    heroPrimaryCtaLabel: String(row.heroPrimaryCtaLabel || defaultState.heroPrimaryCtaLabel).trim() || defaultState.heroPrimaryCtaLabel,
    heroPrimaryCtaLabelEn: String(row.heroPrimaryCtaLabelEn || "").trim(),
    heroPrimaryCtaHref: String(row.heroPrimaryCtaHref || defaultState.heroPrimaryCtaHref).trim() || defaultState.heroPrimaryCtaHref,
    heroSecondaryCtaLabel: String(row.heroSecondaryCtaLabel || defaultState.heroSecondaryCtaLabel).trim() || defaultState.heroSecondaryCtaLabel,
    heroSecondaryCtaLabelEn: String(row.heroSecondaryCtaLabelEn || "").trim(),
    heroSecondaryCtaHref: String(row.heroSecondaryCtaHref || defaultState.heroSecondaryCtaHref).trim() || defaultState.heroSecondaryCtaHref,
    heroStripProductIds: normalizeLegacyIdList(row.heroStripProductIds, limitForLandingSection("heroStripProductIds")),
    highlightedProductIds: normalizeLegacyIdList(row.highlightedProductIds, limitForLandingSection("highlightedProductIds")),
    popularProductIds: normalizeLegacyIdList(row.popularProductIds, limitForLandingSection("popularProductIds")),
    arrivalsProductIds: normalizeLegacyIdList(row.arrivalsProductIds, limitForLandingSection("arrivalsProductIds")),
    saleProductIds: normalizeLegacyIdList(row.saleProductIds, limitForLandingSection("saleProductIds")),
    trendingProductIds: normalizeLegacyIdList(row.trendingProductIds, limitForLandingSection("trendingProductIds")),
  };
};

const createCustomSectionId = () => `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function AdminLandingSectionsPage() {
  const [state, setState] = useState<LandingSectionsState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pickerValues, setPickerValues] = useState<Record<LandingProductSectionKey, string>>(defaultPickerValue);
  const [customPickerValues, setCustomPickerValues] = useState<Record<string, string>>({});

  const landingProductMap = useMemo(
    () => new Map<number, CatalogProduct>(productResults.map((item) => [item.legacyId, item])),
    [productResults],
  );

  const orderedPageEntries = useMemo(
    () => getOrderedLandingPageEntries(state.fixedSections, state.productSections, state.customSections),
    [state.customSections, state.fixedSections, state.productSections],
  );

  const pagePositionByFixedKey = useMemo(
    () =>
      new Map(
        orderedPageEntries
          .filter((entry): entry is Extract<LandingPageOrderEntry, { kind: "fixed" }> => entry.kind === "fixed")
          .map((entry, index) => [entry.key, index + 1] as const),
      ),
    [orderedPageEntries],
  );

  const pagePositionByBuiltInKey = useMemo(
    () =>
      new Map(
        orderedPageEntries
          .filter((entry): entry is Extract<LandingPageOrderEntry, { kind: "builtin" }> => entry.kind === "builtin")
          .map((entry, index) => [entry.key, index + 1] as const),
      ),
    [orderedPageEntries],
  );

  const pagePositionByCustomId = useMemo(
    () =>
      new Map(
        orderedPageEntries
          .filter((entry): entry is Extract<LandingPageOrderEntry, { kind: "custom" }> => entry.kind === "custom")
          .map((entry, index) => [entry.id, index + 1] as const),
      ),
    [orderedPageEntries],
  );

  const displaySections = useMemo<LandingDisplaySection[]>(() => {
    const orderedControls = normalizeLandingProductSections(state.productSections);
    return orderedControls.map((control) => {
      const config = getLandingProductSectionConfig(control.key);
      if (!config) {
        throw new Error(`Missing landing section config for ${control.key}`);
      }
      const ids = state[control.key];
      const displayPosition = pagePositionByBuiltInKey.get(control.key) ?? null;

      return {
        ...config,
        control,
        ids,
        displayPosition,
        names: ids.map((id) => landingProductMap.get(id)?.name || `#${id}`).slice(0, 3),
      };
    });
  }, [landingProductMap, pagePositionByBuiltInKey, state]);

  const fixedDisplaySections = useMemo(
    () =>
      normalizeLandingFixedSections(state.fixedSections).map((control) => {
        const config = getLandingFixedSectionConfig(control.key);
        if (!config) throw new Error(`Missing landing fixed section config for ${control.key}`);
        return {
          ...config,
          control,
          displayPosition: pagePositionByFixedKey.get(control.key) ?? null,
        };
      }),
    [pagePositionByFixedKey, state.fixedSections],
  );

  const landingPageRows = useMemo(() => {
    return orderedPageEntries.map((entry, index) => {
      if (entry.kind === "fixed") {
        const section = fixedDisplaySections.find((item) => item.key === entry.key);
        return {
          id: `fixed-${entry.key}`,
          position: index + 1,
          kindLabel: "Blok",
          title: section?.label || entry.key,
          description: section?.description || "",
          enabled: section?.control.enabled !== false,
          detail: "Bez proizvoda",
        };
      }

      if (entry.kind === "custom") {
        const section = state.customSections.find((item) => item.id === entry.id);
        return {
          id: `custom-${entry.id}`,
          position: index + 1,
          kindLabel: "Custom",
          title: section?.title?.trim() || "Custom sekcija",
          description: section?.subtitle?.trim() || "Rucno dodata produkt sekcija.",
          enabled: section?.enabled !== false,
          detail: `${section?.productIds.length || 0}/12 proizvoda`,
        };
      }

      const section = displaySections.find((item) => item.key === entry.key);
      return {
        id: `builtin-${entry.key}`,
        position: index + 1,
        kindLabel: "Proizvodi",
        title: section?.label || entry.key,
        description: section?.description || "",
        enabled: section?.control.enabled !== false,
        detail: `${section?.ids.length || 0}/${section?.limit || 0} proizvoda`,
      };
    });
  }, [displaySections, fixedDisplaySections, orderedPageEntries, state.customSections]);

  const loadSections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings");
      const json = await res.json();
      if (!json?.success || !json?.settings) {
        setError(json?.message || "Load failed");
        return;
      }
      setState(normalizeLandingState(json.settings));
      setPickerValues(defaultPickerValue);
      setCustomPickerValues({});
    } catch (e: any) {
      setError(e?.message || "Load failed");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (queryValue = productQuery) => {
    setProductsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "60");
      params.set("activeOnly", "1");
      params.set("exportOnly", "1");
      params.set("requireDirectImages", "1");
      params.set("requireReachableImages", "1");
      const normalizedQuery = queryValue.trim();
      if (normalizedQuery) params.set("q", normalizedQuery);

      const res = await fetch(`/api/admin/webshop/products?${params.toString()}`);
      const json = await res.json();
      if (!json?.success) return;
      setProductResults((json.data || []) as CatalogProduct[]);
    } catch {
      // Search failures should not block admin edits.
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    void loadSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadProducts(productQuery);
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery]);

  const replaceLandingSectionIds = (key: LandingProductSectionKey, nextIds: unknown) => {
    const limit = limitForLandingSection(key);
    setState((prev) => ({ ...prev, [key]: normalizeLegacyIdList(nextIds, limit) }));
  };

  const moveLandingSectionId = (key: LandingProductSectionKey, from: number, to: number) => {
    if (from < 0 || to < 0) return;
    setState((prev) => {
      const current = [...prev[key]];
      if (from >= current.length || to >= current.length) return prev;
      const [picked] = current.splice(from, 1);
      current.splice(to, 0, picked);
      return { ...prev, [key]: current };
    });
  };

  const removeLandingSectionId = (key: LandingProductSectionKey, id: number) => {
    setState((prev) => ({ ...prev, [key]: prev[key].filter((value) => value !== id) }));
  };

  const addLandingSectionId = (key: LandingProductSectionKey, idValue: string) => {
    const id = Number(idValue);
    if (!Number.isFinite(id) || id <= 0) return;
    const limit = limitForLandingSection(key);
    setState((prev) => {
      const current = prev[key];
      if (current.includes(id) || current.length >= limit) return prev;
      return { ...prev, [key]: [...current, id] };
    });
    setPickerValues((prev) => ({ ...prev, [key]: "" }));
  };

  const addCustomSection = () => {
    setState((prev) => ({
      ...prev,
      customSections: normalizeLandingCustomSections([
        ...prev.customSections,
        {
          id: createCustomSectionId(),
          title: "",
          subtitle: "",
          enabled: true,
          order: getOrderedLandingPageEntries(prev.fixedSections, prev.productSections, prev.customSections).length + 1,
          layout: "grid",
          productIds: [],
        },
      ]),
    }));
  };

  const updateCustomSection = (id: string, patch: Partial<Omit<LandingCustomSection, "id">>) => {
    setState((prev) => ({
      ...prev,
      customSections: normalizeLandingCustomSections(
        prev.customSections.map((section) => (section.id === id ? { ...section, ...patch } : section)),
      ),
    }));
  };

  const removeCustomSection = (id: string) => {
    setState((prev) => ({
      ...prev,
      customSections: normalizeLandingCustomSections(prev.customSections.filter((section) => section.id !== id)),
    }));
    setCustomPickerValues((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const replaceCustomSectionIds = (id: string, nextIds: unknown) => {
    setState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === id ? { ...section, productIds: normalizeLegacyIdList(nextIds, 12) } : section,
      ),
    }));
  };

  const moveCustomSectionId = (id: string, from: number, to: number) => {
    if (from < 0 || to < 0) return;
    setState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) => {
        if (section.id !== id) return section;
        if (from >= section.productIds.length || to >= section.productIds.length) return section;
        const nextIds = [...section.productIds];
        const [picked] = nextIds.splice(from, 1);
        nextIds.splice(to, 0, picked);
        return { ...section, productIds: nextIds };
      }),
    }));
  };

  const removeCustomSectionId = (id: string, productId: number) => {
    setState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) =>
        section.id === id ? { ...section, productIds: section.productIds.filter((value) => value !== productId) } : section,
      ),
    }));
  };

  const addCustomSectionId = (id: string, idValue: string) => {
    const productId = Number(idValue);
    if (!Number.isFinite(productId) || productId <= 0) return;
    setState((prev) => ({
      ...prev,
      customSections: prev.customSections.map((section) => {
        if (section.id !== id) return section;
        if (section.productIds.includes(productId) || section.productIds.length >= 12) return section;
        return { ...section, productIds: [...section.productIds, productId] };
      }),
    }));
    setCustomPickerValues((prev) => ({ ...prev, [id]: "" }));
  };

  const setSectionEnabled = (key: LandingProductSectionKey, enabled: boolean) => {
    setState((prev) => {
      const nextSections = normalizeLandingProductSections(
        prev.productSections.map((section) => (section.key === key ? { ...section, enabled } : section)),
      );
      return {
        ...prev,
        showSaleSection: key === "saleProductIds" ? enabled : prev.showSaleSection,
        productSections: nextSections,
      };
    });
  };

  const movePageSection = (entry: LandingPageOrderRef, direction: -1 | 1) => {
    setState((prev) => {
      const orderedEntries = getOrderedLandingPageEntries(prev.fixedSections, prev.productSections, prev.customSections);
      const currentIndex = orderedEntries.findIndex((candidate) =>
        candidate.kind === "fixed" && entry.kind === "fixed"
          ? candidate.key === entry.key
          : candidate.kind === "builtin" && entry.kind === "builtin"
            ? candidate.key === entry.key
            : candidate.kind === "custom" && entry.kind === "custom"
              ? candidate.id === entry.id
              : false,
      );
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedEntries.length) return prev;

      const reordered = [...orderedEntries];
      const [picked] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, picked);
      return {
        ...prev,
        ...applyLandingPageOrder(prev.fixedSections, prev.productSections, prev.customSections, reordered),
      };
    });
  };

  const setFixedSectionEnabled = (key: LandingFixedSectionKey, enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      fixedSections: normalizeLandingFixedSections(
        prev.fixedSections.map((section) => (section.key === key ? { ...section, enabled } : section)),
      ),
    }));
  };

  const setBuiltinLayout = (key: LandingProductSectionKey, layout: LandingProductLayout) => {
    setState((prev) => ({
      ...prev,
      productSections: normalizeLandingProductSections(
        prev.productSections.map((section) => (section.key === key ? { ...section, layout } : section)),
      ),
    }));
  };

  const setCustomLayout = (id: string, layout: LandingProductLayout) => {
    updateCustomSection(id, { layout });
  };

  const saveSections = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/webshop/landing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const json = await res.json();
      if (!json?.success) {
        setError(json?.message || "Save failed");
        return;
      }
      setState(normalizeLandingState(json.settings || state));
      setNotice("Landing sekcije su sacuvane.");
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Landing Sections</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Pocetna i sekcije</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Ovaj ekran upravlja koje landing sekcije su ukljucene i kojim redosledom se prikazuju na pocetnoj strani.
              Kolekcije, hero traka, produkt sekcije, baneri, uniforme i blog mogu da se pomeraju gore/dole.
            </p>
          </div>
          <Link
            href="/admin/webshop?tab=landing"
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
          >
            Otvori full content editor
          </Link>
        </div>
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      </div>

      <div className="sticky top-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">
          <a href="#landing-hero-copy" className="rounded-full border border-slate-200 px-3 py-1.5">Hero</a>
          <a href="#landing-summary" className="rounded-full border border-slate-200 px-3 py-1.5">Pregled</a>
          <a href="#landing-sections-editor" className="rounded-full border border-slate-200 px-3 py-1.5">Standardne sekcije</a>
          <a href="#landing-custom-sections" className="rounded-full border border-slate-200 px-3 py-1.5">Custom sekcije</a>
          <a href="#landing-save-bar" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">Sacuvaj</a>
        </div>
      </div>

      <section id="landing-hero-copy" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm scroll-mt-24 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Hero sekcija</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Tekst i dugmad na pocetnoj</h2>
          </div>
          <p className="text-xs text-slate-500">Ovo menja glavni naslov i CTA dugmad iznad sekcija.</p>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          EN polja su opciona. Ako ostanu prazna, sajt na engleskoj verziji sam pokusava da prevede SR tekst (recnik reci) — za tacan prevod popuni EN polje.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Eyebrow (SR)</span>
              <input
                value={state.heroEyebrow}
                onChange={(e) => setState((prev) => ({ ...prev, heroEyebrow: e.target.value }))}
                placeholder="Santos & Santorini"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Eyebrow (EN)</span>
              <input
                value={state.heroEyebrowEn}
                onChange={(e) => setState((prev) => ({ ...prev, heroEyebrowEn: e.target.value }))}
                placeholder="Santos & Santorini"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Naslov - prvi red (SR)</span>
              <input
                value={state.heroTitleLine1}
                onChange={(e) => setState((prev) => ({ ...prev, heroTitleLine1: e.target.value }))}
                placeholder="Nova kolekcija"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Naslov - prvi red (EN)</span>
              <input
                value={state.heroTitleLine1En}
                onChange={(e) => setState((prev) => ({ ...prev, heroTitleLine1En: e.target.value }))}
                placeholder="New Collection"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Naslov - drugi red (SR)</span>
              <input
                value={state.heroTitleLine2}
                onChange={(e) => setState((prev) => ({ ...prev, heroTitleLine2: e.target.value }))}
                placeholder="2026"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Naslov - drugi red (EN)</span>
              <input
                value={state.heroTitleLine2En}
                onChange={(e) => setState((prev) => ({ ...prev, heroTitleLine2En: e.target.value }))}
                placeholder="2026"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Primarno dugme (SR)</span>
              <input
                value={state.heroPrimaryCtaLabel}
                onChange={(e) => setState((prev) => ({ ...prev, heroPrimaryCtaLabel: e.target.value }))}
                placeholder="Web shop"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Primarno dugme (EN)</span>
              <input
                value={state.heroPrimaryCtaLabelEn}
                onChange={(e) => setState((prev) => ({ ...prev, heroPrimaryCtaLabelEn: e.target.value }))}
                placeholder="Web Shop"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Primarni link</span>
            <input
              value={state.heroPrimaryCtaHref}
              onChange={(e) => setState((prev) => ({ ...prev, heroPrimaryCtaHref: e.target.value }))}
              placeholder="/web-shop"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Sekundarno dugme (SR)</span>
              <input
                value={state.heroSecondaryCtaLabel}
                onChange={(e) => setState((prev) => ({ ...prev, heroSecondaryCtaLabel: e.target.value }))}
                placeholder="Kontakt"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Sekundarno dugme (EN)</span>
              <input
                value={state.heroSecondaryCtaLabelEn}
                onChange={(e) => setState((prev) => ({ ...prev, heroSecondaryCtaLabelEn: e.target.value }))}
                placeholder="Contact"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Sekundarni link</span>
            <input
              value={state.heroSecondaryCtaHref}
              onChange={(e) => setState((prev) => ({ ...prev, heroSecondaryCtaHref: e.target.value }))}
              placeholder="/kontakt"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <div id="landing-summary" className="grid gap-4 scroll-mt-24 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Redosled na home-u</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Pozicije sekcija</h2>
            </div>
            <p className="text-xs text-slate-500">{landingPageRows.length} blokova u rasporedu</p>
          </div>
          <div className="mt-4 grid gap-2">
            {landingPageRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-[44px_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-[52px_1fr_auto] sm:items-center"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white sm:h-12 sm:w-12">
                  {row.position}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.title}</p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                      {row.kindLabel}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.description}</p>
                </div>
                <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:justify-end">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      row.enabled
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-white text-slate-500"
                    }`}
                  >
                    {row.enabled ? "Ukljuceno" : "Iskljuceno"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {row.detail}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Produkt sekcije</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">Brzi pregled proizvoda</h2>
          <div className="mt-4 grid gap-3">
            {displaySections.map((section) => (
              <div key={section.key} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{section.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Pozicija {section.displayPosition || "-"} / {section.ids.length}/{section.limit} proizvoda
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                      section.control.enabled
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {section.control.enabled ? "ON" : "OFF"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {section.names.length ? (
                    section.names.map((name, index) => (
                      <span
                        key={`${section.key}-${section.ids[index] || index}`}
                        className="max-w-full truncate rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                      >
                        {name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">Nema rucno dodatih proizvoda.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div id="landing-sections-editor" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm scroll-mt-24 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Raspored i sadrzaj sekcija</p>
            <p className="mt-1 text-sm text-slate-600">
              Ako produkt sekcija ostane prazna, storefront i dalje koristi postojeci fallback za proizvode. Redosled vazi
              za sve glavne landing blokove na home stranici.
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto">
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Pretraga po ID, SKU ili nazivu"
              className="w-full min-w-0 rounded-full border border-slate-200 px-4 py-2 text-sm sm:min-w-[280px]"
            />
            <button
              onClick={() => loadProducts()}
              disabled={productsLoading}
              className="w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 sm:w-auto"
            >
              {productsLoading ? "Pretraga..." : "Pretrazi proizvode"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          {fixedDisplaySections.map((section) => {
            const pagePosition = pagePositionByFixedKey.get(section.key) ?? null;

            return (
              <section key={section.key} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                    <p className="text-xs text-slate-500">
                      Pozicija na home-u: {pagePosition || "-"} / {section.description}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                    <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 sm:py-1.5">
                      <input
                        type="checkbox"
                        checked={section.control.enabled}
                        onChange={(e) => setFixedSectionEnabled(section.key, e.target.checked)}
                      />
                      {section.control.enabled ? "Ukljucena" : "Iskljucena"}
                    </label>
                    <button
                      type="button"
                      onClick={() => movePageSection({ kind: "fixed", key: section.key }, -1)}
                      disabled={pagePosition == null || pagePosition <= 1}
                      className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                    >
                      Gore
                    </button>
                    <button
                      type="button"
                      onClick={() => movePageSection({ kind: "fixed", key: section.key }, 1)}
                      disabled={pagePosition == null || pagePosition >= orderedPageEntries.length}
                      className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                    >
                      Dole
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          {displaySections.map((section) => {
            const sectionIds = state[section.key];
            const csvValue = sectionIds.join(",");
            const candidates = productResults.filter((item) => !sectionIds.includes(item.legacyId));
            const pagePosition = pagePositionByBuiltInKey.get(section.key) ?? null;

            return (
              <section key={section.key} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{section.label}</p>
                    <p className="text-xs text-slate-500">
                      Pozicija na home-u: {pagePosition || "-"} / {section.description}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                    <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 sm:py-1.5">
                      <input
                        type="checkbox"
                        checked={section.control.enabled}
                        onChange={(e) => setSectionEnabled(section.key, e.target.checked)}
                      />
                      {section.control.enabled ? "Ukljucena" : "Iskljucena"}
                    </label>
                    <button
                      type="button"
                      onClick={() => movePageSection({ kind: "builtin", key: section.key }, -1)}
                      disabled={pagePosition == null || pagePosition <= 1}
                      className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                    >
                      Gore
                    </button>
                    <button
                      type="button"
                      onClick={() => movePageSection({ kind: "builtin", key: section.key }, 1)}
                      disabled={pagePosition == null || pagePosition >= orderedPageEntries.length}
                      className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                    >
                      Dole
                    </button>
                    <label className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 sm:col-span-1 sm:border-0 sm:px-0 sm:py-0">
                      <span className="uppercase tracking-[0.08em]">Prikaz</span>
                      <select
                        value={section.control.layout}
                        onChange={(e) => setBuiltinLayout(section.key, e.target.value as LandingProductLayout)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800 disabled:opacity-40"
                      >
                        <option value="grid">Mreza</option>
                        <option value="carousel">Karusel (horizontalno)</option>
                      </select>
                    </label>
                  </div>
                </div>

                {section.key === "saleProductIds" ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={state.saleSectionTitle}
                      onChange={(e) => setState((prev) => ({ ...prev, saleSectionTitle: e.target.value }))}
                      placeholder="Naslov sale sekcije"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={state.saleSectionSubtitle}
                      onChange={(e) => setState((prev) => ({ ...prev, saleSectionSubtitle: e.target.value }))}
                      placeholder="Podnaslov sale sekcije"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <input
                    value={csvValue}
                    onChange={(e) => replaceLandingSectionIds(section.key, e.target.value)}
                    placeholder="Legacy ID lista: 101,205,333"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                  />
                  <select
                    value={pickerValues[section.key]}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPickerValues((prev) => ({ ...prev, [section.key]: value }));
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

                <AdminLandingProductPickGrid
                  candidates={candidates}
                  onPick={(legacyId) => addLandingSectionId(section.key, String(legacyId))}
                  emptyHint={
                    productsLoading
                      ? undefined
                      : productResults.length === 0
                        ? "Kucaj pojam iznad - rezultati se ucitavaju automatski."
                        : undefined
                  }
                />

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionIds.length === 0 ? <p className="text-xs text-slate-500">Nema manuelno odabranih proizvoda.</p> : null}
                  {sectionIds.map((id, index) => {
                    const product = landingProductMap.get(id);
                    return (
                      <div
                        key={`${section.key}-${id}`}
                        className="grid grid-cols-[36px_1fr] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                      >
                        {product?.coverImage ? (
                          <Image
                            src={product.coverImage}
                            alt={product.name}
                            width={28}
                            height={28}
                            className="h-9 w-9 rounded-lg object-cover"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="h-9 w-9 rounded-lg border border-slate-200 bg-white"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-700">
                            #{id}
                            {product ? ` / ${product.sku}` : ""}
                          </p>
                          <p className="truncate text-slate-500">{product?.name || "Nepoznat proizvod"}</p>
                          <div className="mt-2 grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index - 1)}
                              disabled={index === 0}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                            >
                              Gore
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLandingSectionId(section.key, index, index + 1)}
                              disabled={index === sectionIds.length - 1}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                            >
                              Dole
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLandingSectionId(section.key, id)}
                              className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-semibold text-rose-700"
                            >
                              Ukloni
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div id="landing-custom-sections" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm scroll-mt-24 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Custom sekcije</p>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Ovde dodajes nove produkt sekcije sa svojim naslovom i proizvodima. Ulaze u isti raspored kao standardni
              landing blokovi, pa mogu da idu iznad ili ispod bilo koje sekcije.
            </p>
          </div>
          <button
            type="button"
            onClick={addCustomSection}
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 sm:w-auto"
          >
            Dodaj sekciju
          </button>
        </div>

        {state.customSections.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
            Jos nema dodatih custom sekcija.
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {state.customSections.map((section, sectionIndex) => {
              const csvValue = section.productIds.join(",");
              const candidates = productResults.filter((item) => !section.productIds.includes(item.legacyId));
              const pagePosition = pagePositionByCustomId.get(section.id) ?? null;

              return (
                <section key={section.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {section.title || `Nova sekcija ${sectionIndex + 1}`}
                      </p>
                      <p className="text-xs text-slate-500">
                        Pozicija na home-u: {pagePosition || "-"} / 12 proizvoda max
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-end">
                      <label className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700 sm:py-1.5">
                        <input
                          type="checkbox"
                          checked={section.enabled}
                          onChange={(e) => updateCustomSection(section.id, { enabled: e.target.checked })}
                        />
                        {section.enabled ? "Ukljucena" : "Iskljucena"}
                      </label>
                      <button
                        type="button"
                        onClick={() => movePageSection({ kind: "custom", id: section.id }, -1)}
                        disabled={pagePosition == null || pagePosition <= 1}
                        className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                      >
                        Gore
                      </button>
                      <button
                        type="button"
                        onClick={() => movePageSection({ kind: "custom", id: section.id }, 1)}
                        disabled={pagePosition == null || pagePosition >= orderedPageEntries.length}
                        className="rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-40 sm:py-1.5"
                      >
                        Dole
                      </button>
                      <label className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 sm:col-span-1 sm:border-0 sm:px-0 sm:py-0">
                        <span className="uppercase tracking-[0.08em]">Prikaz</span>
                        <select
                          value={section.layout}
                          onChange={(e) => setCustomLayout(section.id, e.target.value as LandingProductLayout)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-800"
                        >
                          <option value="grid">Mreza</option>
                          <option value="carousel">Karusel (horizontalno)</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCustomSection(section.id)}
                        className="col-span-2 rounded-full border border-rose-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700 sm:col-span-1 sm:py-1.5"
                      >
                        Obrisi
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      value={section.title}
                      onChange={(e) => updateCustomSection(section.id, { title: e.target.value })}
                      placeholder="Naslov sekcije"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={section.subtitle}
                      onChange={(e) => updateCustomSection(section.id, { subtitle: e.target.value })}
                      placeholder="Podnaslov sekcije"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={section.ctaLabel}
                      onChange={(e) => updateCustomSection(section.id, { ctaLabel: e.target.value })}
                      placeholder="CTA label"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={section.ctaHref}
                      onChange={(e) => updateCustomSection(section.id, { ctaHref: e.target.value })}
                      placeholder="CTA href"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <input
                      value={csvValue}
                      onChange={(e) => replaceCustomSectionIds(section.id, e.target.value)}
                      placeholder="Legacy ID lista: 101,205,333"
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
                    />
                    <select
                      value={customPickerValues[section.id] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomPickerValues((prev) => ({ ...prev, [section.id]: value }));
                        if (value) addCustomSectionId(section.id, value);
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Dodaj iz pretrage...</option>
                      {candidates.map((item) => (
                        <option key={`${section.id}-${item.legacyId}`} value={item.legacyId}>
                          #{item.legacyId} / {item.sku} - {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <AdminLandingProductPickGrid
                    candidates={candidates}
                    onPick={(legacyId) => addCustomSectionId(section.id, String(legacyId))}
                    emptyHint={
                      productsLoading
                        ? undefined
                        : productResults.length === 0
                          ? "Kucaj pojam iznad - rezultati se ucitavaju automatski."
                          : undefined
                    }
                  />

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {section.productIds.length === 0 ? (
                      <p className="text-xs text-slate-500">Sekcija je prazna dok ne dodas proizvode.</p>
                    ) : null}
                    {section.productIds.map((id, index) => {
                      const product = landingProductMap.get(id);
                      return (
                        <div
                          key={`${section.id}-${id}`}
                          className="grid grid-cols-[36px_1fr] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs"
                        >
                          {product?.coverImage ? (
                            <Image
                              src={product.coverImage}
                              alt={product.name}
                              width={28}
                              height={28}
                              className="h-9 w-9 rounded-lg object-cover"
                              unoptimized
                            />
                          ) : (
                            <div
                              className="h-9 w-9 rounded-lg border border-slate-200 bg-white"
                              aria-hidden="true"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-700">
                              #{id}
                              {product ? ` / ${product.sku}` : ""}
                            </p>
                            <p className="truncate text-slate-500">{product?.name || "Nepoznat proizvod"}</p>
                            <div className="mt-2 grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                onClick={() => moveCustomSectionId(section.id, index, index - 1)}
                                disabled={index === 0}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                              >
                                Gore
                              </button>
                              <button
                                type="button"
                                onClick={() => moveCustomSectionId(section.id, index, index + 1)}
                                disabled={index === section.productIds.length - 1}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 disabled:opacity-40"
                              >
                                Dole
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCustomSectionId(section.id, id)}
                                className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-semibold text-rose-700"
                              >
                                Ukloni
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div id="landing-save-bar" className="sticky bottom-3 z-10 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            Promene se ne cuvaju automatski. Ovaj ekran sada upravlja ukljucivanjem sekcija, njihovim redosledom i listama proizvoda.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                void loadSections();
                void loadProducts("");
              }}
              disabled={loading || saving}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700"
            >
              {loading ? "Osvezavanje..." : "Osvezi"}
            </button>
            <button
              onClick={saveSections}
              disabled={saving || loading}
              className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"
            >
              {saving ? "Cuvanje..." : "Sacuvaj sekcije"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
