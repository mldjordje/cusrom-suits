"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";

type ShopCategory = {
  id?: number;
  key?: string;
  name: string;
  /** "group" = filter by categoryGroup keyword; "id" = filter by exact admin categoryId */
  filterMode?: "group" | "id";
};

type ActiveFilterChip = {
  key: string;
  label: string;
  href: string;
};

type SortOption = {
  value: string;
  label: string;
};

type WebShopFiltersProps = {
  lang: StorefrontLanguage;
  query: string;
  categoryId: number;
  categoryGroup: string;
  selectedCategoryValue: string;
  inStock: boolean;
  onSale: boolean;
  sort: string;
  categories: ShopCategory[];
  featuredCategories: ShopCategory[];
  activeFilterChips: ActiveFilterChip[];
  showingCount: number;
  totalCount: number;
  sortOptions: SortOption[];
  availableSizes?: string[];
  selectedSizes?: string[];
  priceMin?: number;
  priceMax?: number;
  priceFloor?: number;
  priceCeiling?: number;
  children: ReactNode;
};

const toShopHref = (lang: StorefrontLanguage, queryString?: string) => {
  const suffix = lang === "en" ? (queryString ? `?${queryString}&lang=en` : "?lang=en") : queryString ? `?${queryString}` : "";
  return `/web-shop${suffix}`;
};

export default function WebShopFilters({
  lang,
  query,
  categoryId,
  categoryGroup,
  selectedCategoryValue,
  inStock,
  onSale,
  sort,
  categories,
  featuredCategories,
  activeFilterChips,
  showingCount,
  totalCount,
  sortOptions,
  availableSizes = [],
  selectedSizes = [],
  priceMin = 0,
  priceMax = 0,
  priceFloor = 0,
  priceCeiling = 0,
  children,
}: WebShopFiltersProps) {
  const isEn = lang === "en";
  const localizeCategory = (value: string) => localizeDynamicCategoryLabel(value, isEn ? "en" : "sr");
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    const shouldLockScroll = mobileSortOpen || mobileFilterOpen;
    if (!shouldLockScroll) return;

    const scrollY = window.scrollY;
    const { body } = document;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [mobileFilterOpen, mobileSortOpen]);

  const closeMobilePanels = () => {
    setMobileSortOpen(false);
    setMobileFilterOpen(false);
  };

  const makeHref = (patch: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      q: query.trim(),
      categoryId: categoryId > 0 ? String(categoryId) : "",
      categoryGroup,
      inStock: inStock ? "1" : "",
      onSale: onSale ? "1" : "",
      sort: sort !== "featured" ? sort : "",
      priceMin: priceMin > 0 ? String(priceMin) : "",
      priceMax: priceMax > 0 ? String(priceMax) : "",
      size: selectedSizes.length ? selectedSizes.join(",") : "",
    };

    for (const [key, value] of Object.entries(current)) {
      if (value) params.set(key, value);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    return toShopHref(lang, params.toString());
  };

  const rootHref = toShopHref(lang);
  const currentSortLabel = sortOptions.find((option) => option.value === sort)?.label || sortOptions[0]?.label || sort;

  const renderCategoryLinks = (className: string) => (
    <div className={className}>
      <Link
        href={makeHref({ categoryId: null, categoryGroup: null, onSale: null, q: null })}
        className={`ss-shop-filter-chip ${categoryId <= 0 && !categoryGroup && !onSale ? "is-active" : ""}`}
      >
        {isEn ? "All products" : "Svi proizvodi"}
      </Link>
      <Link
        href={makeHref({ categoryId: null, categoryGroup: null, onSale: onSale && categoryId <= 0 ? null : 1, q: null })}
        className={`ss-shop-filter-chip ${onSale && categoryId <= 0 && !categoryGroup ? "is-active" : ""}`}
      >
        {isEn ? "Sale" : "Akcija"}
      </Link>
      {featuredCategories.map((category) => {
        // id-mode: no own group key — use exact categoryId for filtering
        const useId = category.filterMode === "id" || (!category.key && Boolean(category.id));
        const chipKey = useId ? `id-${category.id}` : (category.key || String(category.id || ""));
        const isActive = useId
          ? categoryId > 0 && categoryId === category.id
          : Boolean(category.key) && categoryGroup === category.key;
        return (
          <Link
            key={chipKey}
            href={makeHref(
              useId
                ? { categoryId: isActive ? null : (category.id ?? null), categoryGroup: null, onSale: null, q: null }
                : { categoryGroup: isActive ? null : (category.key ?? null), categoryId: null, onSale: null, q: null },
            )}
            className={`ss-shop-filter-chip ${isActive ? "is-active" : ""}`}
          >
            {localizeCategory(category.name)}
          </Link>
        );
      })}
    </div>
  );

  const renderSearchField = (fieldId: string) => (
    <div className="ss-shop-form-block">
      <label htmlFor={fieldId} className="ss-shop-form-label">
        {isEn ? "Search products" : "Pretraga proizvoda"}
      </label>
      <input
        id={fieldId}
        type="search"
        name="q"
        defaultValue={query}
        className="form-control"
        placeholder={isEn ? "Search by product name, category or brand" : "Pretrazi po nazivu proizvoda, kategoriji ili brendu"}
      />
      <p className="ss-shop-form-note">
        {isEn
          ? "If you know the product code, search also works with SKU and EAN."
          : "Ako znas sifru proizvoda, pretraga radi i po sifri, SKU-u i EAN-u."}
      </p>
    </div>
  );

  const renderSortField = (fieldId: string) => (
    <div className="ss-shop-form-block">
      <label htmlFor={fieldId} className="ss-shop-form-label">
        {isEn ? "Sort by" : "Sortiranje"}
      </label>
      <select id={fieldId} className="form-select fw-medium" name="sort" defaultValue={sort} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const renderCategoryField = (fieldId: string) => (
    <div className="ss-shop-form-block">
      <label htmlFor={fieldId} className="ss-shop-form-label">
        {isEn ? "Category" : "Kategorija"}
      </label>
      <select
        id={fieldId}
        className="form-select fw-medium"
        name="categoryGroup"
        defaultValue={selectedCategoryValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">{isEn ? "All categories" : "Sve kategorije"}</option>
        {categories.map((category) => (
          <option key={category.key || category.id} value={category.key || category.id}>
            {localizeCategory(category.name)}
          </option>
        ))}
      </select>
    </div>
  );

  const renderToggleField = (name: string, checked: boolean, label: string) => (
    <label className="ss-shop-toggle-field">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} />
      <span>{label}</span>
    </label>
  );

  const priceFloorInput = 1;
  const priceCeilingInput = undefined;

  const selectedSizesSet = new Set(selectedSizes.map((v) => v.toUpperCase()));

  const buildSizeToggleHref = (size: string) => {
    const normalized = size.toUpperCase();
    const next = selectedSizesSet.has(normalized)
      ? selectedSizes.filter((v) => v.toUpperCase() !== normalized)
      : [...selectedSizes, normalized];
    return makeHref({ size: next.length ? next.join(",") : null });
  };

  const renderPriceField = (formId: string) => (
    <div className="ss-shop-form-block">
      <span className="ss-shop-form-label">{isEn ? "Price (RSD)" : "Cena (RSD)"}</span>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
        <input
          id={`${formId}-priceMin`}
          name="priceMin"
          type="number"
          inputMode="numeric"
          min={priceFloorInput}
          max={priceCeilingInput}
          step={1}
          defaultValue={priceMin > 0 ? priceMin : ""}
          placeholder={isEn ? "From" : "Od"}
          className="form-control"
        />
        <input
          id={`${formId}-priceMax`}
          name="priceMax"
          type="number"
          inputMode="numeric"
          min={priceFloorInput}
          max={priceCeilingInput}
          step={1}
          defaultValue={priceMax > 0 ? priceMax : ""}
          placeholder={priceCeilingInput ? String(priceCeilingInput) : isEn ? "To" : "Do"}
          className="form-control"
        />
      </div>
      {priceFloor > 0 && priceCeiling > 0 ? (
        <p className="ss-shop-form-note" style={{ marginTop: 6 }}>
          {isEn ? "Catalog range" : "Opseg iz kataloga"}: {priceFloor.toLocaleString("sr-RS")} -{" "}
          {priceCeiling.toLocaleString("sr-RS")} RSD. {isEn ? "Minimum filter starts from 1 RSD." : "Filter moze da krene od 1 RSD."}
        </p>
      ) : null}
    </div>
  );

  const renderSizeField = () => {
    if (!availableSizes || availableSizes.length === 0) return null;
    const selectedCount = selectedSizes.length;
    return (
      <details className="ss-shop-form-block" open={selectedCount > 0} style={{ border: "none", padding: 0 }}>
        <summary
          style={{
            listStyle: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            userSelect: "none",
          }}
          className="ss-shop-form-label"
        >
          <span>{isEn ? "Size" : "Velicina"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {selectedCount > 0 ? (
              <span
                style={{
                  background: "#1f2937",
                  color: "#fff",
                  borderRadius: "999px",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 7px",
                  lineHeight: "18px",
                }}
              >
                {selectedCount}
              </span>
            ) : null}
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 400 }}>▾</span>
          </span>
        </summary>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {selectedSizes.map((size) => (
            <input key={`hidden-${size}`} type="hidden" name="size" value={size.toUpperCase()} />
          ))}
          {availableSizes.map((size) => {
            const normalized = size.toUpperCase();
            const isActive = selectedSizesSet.has(normalized);
            return (
              <Link
                key={size}
                href={buildSizeToggleHref(size)}
                className={`ss-shop-filter-chip${isActive ? " is-active" : ""}`}
                style={{ minWidth: 48, textAlign: "center", fontSize: 12 }}
              >
                {size}
              </Link>
            );
          })}
        </div>
      </details>
    );
  };

  const renderForm = (formId: string, compact = false) => (
    <form action="/web-shop" method="get" id={formId} className={`ss-shop-filter-form ${compact ? "is-compact" : ""}`}>
      {lang === "en" ? <input type="hidden" name="lang" value="en" /> : null}
      {renderSearchField(`${formId}-query`)}
      {renderSortField(`${formId}-sort`)}
      {renderCategoryField(`${formId}-category`)}
      {renderPriceField(formId)}
      {renderSizeField()}

      <div className="ss-shop-form-grid">
        {renderToggleField("inStock", inStock, isEn ? "Only in stock" : "Samo na stanju")}
        {renderToggleField("onSale", onSale, isEn ? "Only discounted" : "Samo na akciji")}
      </div>

      <div className="ss-shop-form-actions">
        <button type="submit" className="btn btn-primary text-uppercase fw-medium">
          {isEn ? "Apply filters" : "Primeni filtere"}
        </button>
        <Link
          href={rootHref}
          className={`btn btn-outline-dark text-uppercase fw-medium ${activeFilterChips.length === 0 ? "disabled pe-none opacity-50" : ""}`}
        >
          {isEn ? "Reset all" : "Resetuj sve"}
        </Link>
      </div>
    </form>
  );

  return (
    <div className="ss-shop-layout">
      <aside className="ss-shop-sidebar d-none d-lg-block">
        <div className="ss-filter-panel ss-shop-sidebar__panel">
          <div className="ss-shop-sidebar__header">
            <div className="ss-shop-sidebar__header-left">
              <p className="ss-shop-sidebar__eyebrow">{isEn ? "Refine" : "Filtriraj"}</p>
              <h3 className="ss-shop-sidebar__title">{isEn ? "Filters" : "Filteri"}</h3>
            </div>
            <div className="ss-shop-sidebar__count">
              <span>{showingCount}</span>
              <span className="ss-shop-sidebar__count-sep">/</span>
              <span>{totalCount}</span>
            </div>
          </div>

          {renderCategoryLinks("ss-shop-sidebar__categories")}
          {renderForm("ss-shop-desktop-filters")}
        </div>
      </aside>

      <div className="ss-shop-feed">
        <div className="ss-shop-mobile-toolbar d-lg-none">
          <div className="ss-shop-mobile-toolbar__top">
            <div
              className="ss-shop-mobile-toolbar__summary ss-shop-mobile-toolbar__summary--compact"
              aria-label={
                isEn
                  ? `Showing ${showingCount} of ${totalCount} products`
                  : `Prikazano ${showingCount} od ${totalCount} proizvoda`
              }
            >
              <strong>
                {showingCount}/{totalCount}
              </strong>
              {activeFilterChips.length > 0 ? (
                <span className="ss-shop-mobile-toolbar__active" title={isEn ? "Active filters" : "Aktivni filteri"}>
                  {activeFilterChips.length}
                </span>
              ) : null}
            </div>

            <div className="ss-shop-mobile-toolbar__actions">
            <button
              type="button"
              className="ss-shop-mobile-trigger"
              aria-expanded={mobileSortOpen}
              onClick={() => {
                setMobileFilterOpen(false);
                setMobileSortOpen((current) => !current);
              }}
            >
              {isEn ? "Sort" : "Sort"}
            </button>
            <button
              type="button"
              className="ss-shop-mobile-trigger ss-shop-mobile-trigger--primary"
              aria-expanded={mobileFilterOpen}
              onClick={() => {
                setMobileSortOpen(false);
                setMobileFilterOpen((current) => !current);
              }}
            >
              {isEn ? "Filters" : "Filteri"}
              {activeFilterChips.length > 0 ? <span className="ss-shop-mobile-trigger__count">{activeFilterChips.length}</span> : null}
            </button>

            <button
              type="button"
              aria-label={isEn ? "Close sort" : "Zatvori sortiranje"}
              className={`ss-shop-mobile-overlay ss-shop-mobile-overlay--popover ${mobileSortOpen ? "is-open" : ""}`}
              onClick={closeMobilePanels}
            />
            <div className={`ss-shop-mobile-popover ${mobileSortOpen ? "is-open" : ""}`}>
              <div className="ss-shop-mobile-popover__header">
                <div>
                  <span className="ss-shop-mobile-popover__eyebrow">{isEn ? "Current sort" : "Trenutni sort"}</span>
                  <strong>{currentSortLabel}</strong>
                </div>
                <button type="button" className="ss-shop-mobile-close" onClick={closeMobilePanels}>
                  {isEn ? "Close" : "Zatvori"}
                </button>
              </div>
              <div className="ss-shop-mobile-sort-links">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={makeHref({ sort: option.value === "featured" ? null : option.value })}
                    className={`ss-shop-mobile-sort-link ${sort === option.value ? "is-active" : ""}`}
                    onClick={closeMobilePanels}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <button
              type="button"
              aria-label={isEn ? "Close filters" : "Zatvori filtere"}
              className={`ss-shop-mobile-overlay ${mobileFilterOpen ? "is-open" : ""}`}
              onClick={closeMobilePanels}
            />
            <div className={`ss-shop-mobile-drawer ${mobileFilterOpen ? "is-open" : ""}`}>
              <div className="ss-shop-mobile-drawer__header">
                <div>
                  <span className="ss-shop-mobile-popover__eyebrow">{isEn ? "Filter products" : "Filtriraj proizvode"}</span>
                  <strong>{isEn ? "Web shop filters" : "Web shop filteri"}</strong>
                </div>
                <button type="button" className="ss-shop-mobile-close" onClick={closeMobilePanels}>
                  {isEn ? "Close" : "Zatvori"}
                </button>
              </div>

              {renderCategoryLinks("ss-shop-mobile-drawer__categories")}
              {renderForm("ss-shop-mobile-filters", true)}
            </div>
          </div>
          </div>

          {activeFilterChips.length > 0 ? (
            <div className="ss-filter-chip-list ss-filter-chip-list--mobile d-lg-none">
              {activeFilterChips.map((chip) => (
                <Link key={`mobile-${chip.key}`} href={chip.href} className="ss-filter-chip" aria-label={`${isEn ? "Remove" : "Ukloni"} ${chip.label}`}>
                  <span>{chip.label}</span>
                  <span className="ss-filter-chip__x" aria-hidden>×</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="ss-filter-chip-list ss-filter-chip-list--desktop mb-3 d-none d-lg-flex">
            {activeFilterChips.map((chip) => (
              <Link key={chip.key} href={chip.href} className="ss-filter-chip" aria-label={`${isEn ? "Remove" : "Ukloni"} ${chip.label}`}>
                <span>{chip.label}</span>
                <span className="ss-filter-chip__x" aria-hidden>×</span>
              </Link>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
