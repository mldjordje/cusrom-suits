import Link from "next/link";
import type { ReactNode } from "react";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";

type ShopCategory = {
  id: number;
  name: string;
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
  children,
}: WebShopFiltersProps) {
  const isEn = lang === "en";
  const localizeCategory = (value: string) => localizeDynamicCategoryLabel(value, isEn ? "en" : "sr");
  const mobileSortToggleId = "ss-shop-mobile-sort-toggle";
  const mobileFilterToggleId = "ss-shop-mobile-filter-toggle";

  const makeHref = (patch: Record<string, string | number | null>) => {
    const params = new URLSearchParams();
    const current: Record<string, string> = {
      q: query.trim(),
      categoryId: categoryId > 0 ? String(categoryId) : "",
      inStock: inStock ? "1" : "",
      onSale: onSale ? "1" : "",
      sort: sort !== "featured" ? sort : "",
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
        href={makeHref({ categoryId: null, onSale: null })}
        className={`ss-shop-filter-chip ${categoryId <= 0 && !onSale ? "is-active" : ""}`}
      >
        {isEn ? "All products" : "Svi proizvodi"}
      </Link>
      <Link
        href={makeHref({ categoryId: null, onSale: onSale && categoryId <= 0 ? null : 1 })}
        className={`ss-shop-filter-chip ${onSale && categoryId <= 0 ? "is-active" : ""}`}
      >
        {isEn ? "Sale" : "Akcija"}
      </Link>
      {featuredCategories.map((category) => (
        <Link
          key={category.id}
          href={makeHref({
            categoryId: categoryId === category.id ? null : category.id,
            onSale: null,
          })}
          className={`ss-shop-filter-chip ${categoryId === category.id ? "is-active" : ""}`}
        >
          {localizeCategory(category.name)}
        </Link>
      ))}
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
      <select id={fieldId} className="form-select fw-medium" name="sort" defaultValue={sort}>
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
        name="categoryId"
        defaultValue={selectedCategoryValue}
      >
        <option value="">{isEn ? "All categories" : "Sve kategorije"}</option>
        <option value="sale">{isEn ? "Sale" : "Akcija"}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
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

  const renderForm = (formId: string, compact = false) => (
    <form action="/web-shop" method="get" id={formId} className={`ss-shop-filter-form ${compact ? "is-compact" : ""}`}>
      {lang === "en" ? <input type="hidden" name="lang" value="en" /> : null}
      {renderSearchField(`${formId}-query`)}
      {renderSortField(`${formId}-sort`)}
      {renderCategoryField(`${formId}-category`)}

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
          <div className="ss-shop-sidebar__intro">
            <p className="ss-shop-sidebar__eyebrow">{isEn ? "Refine" : "Precizan izbor"}</p>
            <h3>{isEn ? "Keep the selection clean." : "Zadrzi pregled cistim."}</h3>
            <p>
              {isEn
                ? "Search, category, stock and sale controls stay in one calm, minimal block."
                : "Pretraga, kategorije, stanje i akcije su u jednom mirnom, preglednom bloku."}
            </p>
          </div>

          <div className="ss-shop-sidebar__meta">
            <div>
              <span className="ss-shop-sidebar__meta-label">{isEn ? "Showing" : "Prikazano"}</span>
              <strong>{showingCount}</strong>
            </div>
            <div>
              <span className="ss-shop-sidebar__meta-label">{isEn ? "Total" : "Ukupno"}</span>
              <strong>{totalCount}</strong>
            </div>
          </div>

          {renderCategoryLinks("ss-shop-sidebar__categories")}
          {renderForm("ss-shop-desktop-filters")}
        </div>
      </aside>

      <div className="ss-shop-feed">
        <div className="ss-shop-mobile-toolbar d-lg-none">
          <div className="ss-shop-mobile-toolbar__summary ss-shop-mobile-toolbar__summary--compact">
            <strong>
              {showingCount} / {totalCount} {isEn ? "products" : "proizvoda"}
            </strong>
            {activeFilterChips.length > 0 ? (
              <span className="ss-shop-mobile-toolbar__active">
                {activeFilterChips.length} {isEn ? "active filters" : "aktivnih filtera"}
              </span>
            ) : null}
          </div>

          <div className="ss-shop-mobile-toolbar__actions">
            <input id={mobileSortToggleId} type="checkbox" className="ss-shop-mobile-toggle" />
            <input id={mobileFilterToggleId} type="checkbox" className="ss-shop-mobile-toggle" />

            <label htmlFor={mobileSortToggleId} className="ss-shop-mobile-trigger">
              {isEn ? "Sort" : "Sort"}
            </label>
            <label htmlFor={mobileFilterToggleId} className="ss-shop-mobile-trigger ss-shop-mobile-trigger--primary">
              {isEn ? "Filters" : "Filteri"}
              {activeFilterChips.length > 0 ? <span className="ss-shop-mobile-trigger__count">{activeFilterChips.length}</span> : null}
            </label>

            <label htmlFor={mobileSortToggleId} className="ss-shop-mobile-overlay ss-shop-mobile-overlay--popover" />
            <div className="ss-shop-mobile-popover">
              <div className="ss-shop-mobile-popover__header">
                <div>
                  <span className="ss-shop-mobile-popover__eyebrow">{isEn ? "Current sort" : "Trenutni sort"}</span>
                  <strong>{currentSortLabel}</strong>
                </div>
                <label htmlFor={mobileSortToggleId} className="ss-shop-mobile-close">
                  {isEn ? "Close" : "Zatvori"}
                </label>
              </div>
              <div className="ss-shop-mobile-sort-links">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={makeHref({ sort: option.value === "featured" ? null : option.value })}
                    className={`ss-shop-mobile-sort-link ${sort === option.value ? "is-active" : ""}`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>

            <label htmlFor={mobileFilterToggleId} className="ss-shop-mobile-overlay" />
            <div className="ss-shop-mobile-drawer">
              <div className="ss-shop-mobile-drawer__header">
                <div>
                  <span className="ss-shop-mobile-popover__eyebrow">{isEn ? "Filter products" : "Filtriraj proizvode"}</span>
                  <strong>{isEn ? "Web shop filters" : "Web shop filteri"}</strong>
                </div>
                <label htmlFor={mobileFilterToggleId} className="ss-shop-mobile-close">
                  {isEn ? "Close" : "Zatvori"}
                </label>
              </div>

              {renderCategoryLinks("ss-shop-mobile-drawer__categories")}
              {renderForm("ss-shop-mobile-filters", true)}
            </div>
          </div>

          {activeFilterChips.length > 0 ? (
            <div className="ss-filter-chip-list ss-filter-chip-list--mobile d-lg-none">
              {activeFilterChips.map((chip) => (
                <Link key={`mobile-${chip.key}`} href={chip.href} className="ss-filter-chip" aria-label={`${isEn ? "Remove" : "Ukloni"} ${chip.label}`}>
                  <span>{chip.label}</span>
                  <span className="ss-filter-chip__x">x</span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ss-shop-results-bar">
          <div className="ss-shop-results-bar__copy">
            <p className="ss-shop-results-bar__eyebrow">{isEn ? "Selection" : "Izbor"}</p>
            <strong>
              {activeFilterChips.length > 0
                ? `${activeFilterChips.length} ${isEn ? "selected" : "izabrano"}`
                : isEn
                  ? "Clean catalog view"
                  : "Cist prikaz kataloga"}
            </strong>
          </div>

          <Link
            href={rootHref}
            className={`ss-filter-reset-link text-uppercase ${activeFilterChips.length === 0 ? "disabled pe-none opacity-50" : ""}`}
          >
            {isEn ? "Reset all" : "Resetuj sve"}
          </Link>
        </div>

        {activeFilterChips.length > 0 ? (
          <div className="ss-filter-chip-list ss-filter-chip-list--desktop mb-3 d-none d-lg-flex">
            {activeFilterChips.map((chip) => (
              <Link key={chip.key} href={chip.href} className="ss-filter-chip" aria-label={`${isEn ? "Remove" : "Ukloni"} ${chip.label}`}>
                <span>{chip.label}</span>
                <span className="ss-filter-chip__x">x</span>
              </Link>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
