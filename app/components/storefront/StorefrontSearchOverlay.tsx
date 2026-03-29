"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { useCart } from "@/app/components/storefront/cart/StorefrontCartProvider";
import { localizeDynamicCategoryLabel } from "@/lib/storefront/dynamicCopy";

type SearchResultItem = {
  legacyId: number;
  sku: string;
  name: string;
  nameEn: string | null;
  image: string | null;
  priceGross: number;
  priceFinalGross: number;
  stock: number;
  categoryName: string | null;
};

const OPEN_SEARCH_EVENT = "ss:open-storefront-search";
const MIN_QUERY_LENGTH = 2;

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function StorefrontSearchOverlay() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { closeCartDrawer } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const effectiveLang = searchParams.get("lang") === "en" ? "en" : "sr";
  const isEn = effectiveLang === "en";

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const closeSearch = () => {
    setIsOpen(false);
    setIsLoading(false);
  };

  useEffect(() => {
    const focusInput = () => {
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    };

    const handleOpen = () => {
      closeCartDrawer();
      setIsOpen(true);
      focusInput();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handleOpen();
      }
    };

    window.addEventListener(OPEN_SEARCH_EVENT, handleOpen);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, handleOpen);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeCartDrawer]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!isOpen) return;
    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setTotal(0);
      setIsLoading(false);
      setHasSearched(trimmedQuery.length > 0);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/storefront/search?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await res.json();
        if (!active || !json?.success) return;
        setResults(Array.isArray(json.results) ? (json.results as SearchResultItem[]) : []);
        setTotal(Number(json.total || 0));
        setHasSearched(true);
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setResults([]);
        setTotal(0);
        setHasSearched(true);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, query]);

  const trimmedQuery = query.trim();
  const searchHref = withLang(`/web-shop?q=${encodeURIComponent(trimmedQuery)}`);
  const shouldShowHint = trimmedQuery.length === 0;
  const shouldShowMinChars = trimmedQuery.length > 0 && trimmedQuery.length < MIN_QUERY_LENGTH;
  const shouldShowEmpty = hasSearched && !isLoading && trimmedQuery.length >= MIN_QUERY_LENGTH && results.length === 0;

  return (
    <div className={`ss-search-overlay ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <button
        type="button"
        className="ss-search-overlay__backdrop"
        aria-label={isEn ? "Close search" : "Zatvori pretragu"}
        onClick={closeSearch}
      />

      <div
        className="ss-search-overlay__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-search-overlay-title"
      >
        <div className="ss-search-overlay__header">
          <div>
            <p className="ss-search-overlay__eyebrow">{isEn ? "Search" : "Pretraga"}</p>
            <h2 id="ss-search-overlay-title" className="ss-search-overlay__title">
              {isEn ? "Find products fast." : "Pronadji proizvod brzo."}
            </h2>
          </div>
          <button
            type="button"
            className="ss-search-overlay__close"
            onClick={closeSearch}
            aria-label={isEn ? "Close search" : "Zatvori pretragu"}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 4L14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form
          className="ss-search-overlay__form"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedQuery.length < MIN_QUERY_LENGTH) {
              inputRef.current?.focus();
              return;
            }
            closeSearch();
            router.push(searchHref);
          }}
        >
          <label htmlFor="ss-storefront-search-input" className="ss-search-overlay__label">
            {isEn ? "Search input" : "Polje za pretragu"}
          </label>
          <div className="ss-search-overlay__input-wrap">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="9" cy="9" r="5.75" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              id="ss-storefront-search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                isEn
                  ? "Search by product name, category, SKU or brand"
                  : "Pretrazi po nazivu, kategoriji, sifri ili brendu"
              }
              className="ss-search-overlay__input"
            />
            {query.length > 0 ? (
              <button
                type="button"
                className="ss-search-overlay__clear"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                {isEn ? "Clear" : "Obrisi"}
              </button>
            ) : null}
          </div>

          <div className="ss-search-overlay__form-actions">
            <p className="ss-search-overlay__copy">
              {isEn
                ? "Use Enter to open full results in the catalog."
                : "Pritisni Enter za kompletne rezultate u katalogu."}
            </p>
            <button type="submit" className="btn btn-primary">
              {isEn ? "Search catalog" : "Pretrazi katalog"}
            </button>
          </div>
        </form>

        <div className="ss-search-overlay__results">
          {shouldShowHint ? (
            <div className="ss-search-overlay__empty">
              <strong>{isEn ? "Start typing to search." : "Pocni da kucas za pretragu."}</strong>
              <p>
                {isEn
                  ? "Search looks through product names, categories, codes and brands."
                  : "Pretraga prolazi kroz nazive proizvoda, kategorije, sifre i brendove."}
              </p>
            </div>
          ) : null}

          {shouldShowMinChars ? (
            <div className="ss-search-overlay__empty">
              <strong>{isEn ? "Enter at least 2 characters." : "Unesi najmanje 2 karaktera."}</strong>
            </div>
          ) : null}

          {isLoading ? (
            <div className="ss-search-overlay__empty">
              <strong>{isEn ? "Searching..." : "Pretrazujem..."}</strong>
            </div>
          ) : null}

          {!shouldShowHint && !shouldShowMinChars && !isLoading && results.length > 0 ? (
            <>
              <div className="ss-search-overlay__summary">
                <strong>
                  {isEn ? "Quick matches" : "Brzi rezultati"} ({results.length}
                  {total > results.length ? ` / ${total}+` : ` / ${total}`})
                </strong>
                <Link href={searchHref} className="ss-search-overlay__view-all" onClick={closeSearch}>
                  {isEn ? "View all results" : "Pogledaj sve rezultate"}
                </Link>
              </div>

              <div className="ss-search-overlay__grid">
                {results.map((item) => {
                  const detailHref = withLang(`/web-shop/${item.legacyId}`);
                  const displayName = isEn ? item.nameEn || item.name : item.name;
                  const categoryLabel = item.categoryName
                    ? localizeDynamicCategoryLabel(item.categoryName, effectiveLang)
                    : null;
                  const hasDiscount = Number(item.priceGross || 0) > Number(item.priceFinalGross || 0);

                  return (
                    <Link
                      key={item.legacyId}
                      href={detailHref}
                      className="ss-search-overlay__result"
                      onClick={closeSearch}
                    >
                      <div className="ss-search-overlay__result-image">
                        <StorefrontSmartImage
                          sources={[item.image || "/img/odela.jpg"]}
                          width={200}
                          height={240}
                          alt={displayName}
                          sizes="120px"
                          className="ss-search-overlay__result-img-tag"
                          unoptimized
                        />
                      </div>
                      <div className="ss-search-overlay__result-copy">
                        {categoryLabel ? (
                          <span className="ss-search-overlay__result-category">{categoryLabel}</span>
                        ) : null}
                        <strong>{displayName}</strong>
                        <span className="ss-search-overlay__result-sku">{item.sku}</span>
                        <div className="ss-search-overlay__result-prices">
                          <span>{formatRsd(item.priceFinalGross)}</span>
                          {hasDiscount ? <span>{formatRsd(item.priceGross)}</span> : null}
                        </div>
                        <span className={`ss-search-overlay__result-stock ${item.stock > 0 ? "is-available" : "is-unavailable"}`}>
                          {item.stock > 0
                            ? isEn
                              ? "Available now"
                              : "Dostupno odmah"
                            : isEn
                              ? "Check availability"
                              : "Proveri dostupnost"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : null}

          {shouldShowEmpty ? (
            <div className="ss-search-overlay__empty">
              <strong>{isEn ? "No direct matches yet." : "Nema direktnih rezultata."}</strong>
              <p>
                {isEn
                  ? "Try another keyword, SKU or open the full catalog results."
                  : "Probaj drugi pojam, sifru ili otvori kompletne rezultate u katalogu."}
              </p>
              <Link href={searchHref} className="ss-search-overlay__view-all" onClick={closeSearch}>
                {isEn ? "Search the full catalog" : "Pretrazi ceo katalog"}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
