import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

type Category = {
  id: number;
  name: string;
  path: string[];
};

type CategoryTile = {
  id?: string;
  label: string;
  labelEn: string;
  href: string;
  image: string;
};

type Props = {
  categories: Category[];
  tiles: CategoryTile[];
  categoryGroupImages?: Record<string, string>;
  lang?: StorefrontLanguage;
};

export default function HomeCategoryTiles({ categories: _categories, tiles: tilesInput, categoryGroupImages, lang = "sr" }: Props) {
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => {
    if (lang !== "en" || !href.startsWith("/")) return href;
    return href.includes("?") ? `${href}&lang=en` : `${href}?lang=en`;
  };

  const tiles = tilesInput.map((tile) => {
    const groupKey = new URLSearchParams(tile.href.split("?")[1] || "").get("categoryGroup") || "";
    // Admin-set tile image wins; fall back to a live product photo for that
    // category group only when the admin hasn't set one.
    const liveImage = groupKey && categoryGroupImages?.[groupKey];
    return {
      ...tile,
      href: withLang(tile.href),
      label: tx(tile.label, tile.labelEn),
      image: tile.image || liveImage || "/img/hero.jpg",
    };
  });

  return (
    <section className="ss-category-strip py-5">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom">
          <div>
            <span className="lux-eyebrow mb-1">
              {tx("Kolekcije & Kategorije", "Collections & Categories")}
            </span>
            <h2 className="section-title text-uppercase m-0">
              {tx("Istražite Kolekciju", "Explore the Collection")}
            </h2>
          </div>
          <Link href={withLang("/web-shop")} className="btn-link default-underline text-uppercase fw-medium d-none d-md-inline-block">
            {tx("Svi Proizvodi", "All Products")} &rarr;
          </Link>
        </div>
        <div className="row g-3 g-md-4">
          {tiles.slice(0, 4).map((tile) => (
            <div key={tile.id || tile.label} className="col-6 col-lg-3">
              <Link href={tile.href} prefetch={false} className="ss-category-tile d-block position-relative overflow-hidden">
                <div className="ss-category-tile__img-wrap position-relative">
                  <StorefrontImage
                    sources={[tile.image]}
                    fallbackSrc="/img/hero.jpg"
                    width={400}
                    height={533}
                    alt={tile.label}
                    className="ss-category-tile__img w-100"
                    sizes="(max-width: 575px) 50vw, (max-width: 991px) 50vw, 25vw"
                  />
                  <div className="ss-category-tile__overlay" aria-hidden="true" />
                </div>
                <div className="ss-category-tile__label d-flex align-items-center justify-content-between">
                  <span className="ss-category-tile__name">{tile.label}</span>
                  <span className="ss-category-tile__arrow">&rarr;</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
