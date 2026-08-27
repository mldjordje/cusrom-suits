"use client";

import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

type CategoryTile = {
  id?: string;
  label: string;
  labelEn: string;
  href: string;
  image: string;
};

type Props = {
  tiles?: CategoryTile[];
  lang?: string;
};

const DEFAULT_TILES: CategoryTile[] = [
  {
    id: "odela",
    label: "Odela & Sakoi",
    labelEn: "Suits & Blazers",
    href: "/web-shop?categoryGroup=odela",
    image: "/img/hero.jpg",
  },
  {
    id: "kosulje",
    label: "Košulje",
    labelEn: "Shirts",
    href: "/web-shop?categoryGroup=kosulje",
    image: "/img/hero.jpg",
  },
  {
    id: "obuca",
    label: "Obuća",
    labelEn: "Footwear",
    href: "/web-shop?categoryGroup=obuca",
    image: "/img/hero.jpg",
  },
  {
    id: "aksesoari",
    label: "Aksesoari",
    labelEn: "Accessories",
    href: "/web-shop?categoryGroup=aksesoari",
    image: "/img/hero.jpg",
  },
];

export default function LandingCategoryRunway({ tiles = DEFAULT_TILES, lang = "sr" }: Props) {
  const isEn = lang === "en";
  const withLang = (path: string) => (isEn ? `${path}&lang=en` : path);

  const displayTiles = tiles && tiles.length >= 4 ? tiles.slice(0, 4) : DEFAULT_TILES;

  return (
    <section className="ss-lp-category-section">
      <div className="container">
        {/* Section Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-4 pb-2 border-bottom border-dark">
          <div>
            <span className="ss-lp-eyebrow mb-2">
              {isEn ? "Curated Collections" : "Kolekcije & Kategorije"}
            </span>
            <h2 className="ss-lp-title ss-lp-title--dark m-0 fs-1">
              {isEn ? "Explore the Collection" : "Istražite Kolekciju"}
            </h2>
          </div>
          <Link
            href={isEn ? "/web-shop?lang=en" : "/web-shop"}
            className="ss-lp-btn-link mt-3 mt-md-0"
          >
            {isEn ? "View All Products →" : "Svi Proizvodi →"}
          </Link>
        </div>

        {/* 4-Tile Editorial Grid */}
        <div className="row g-3 g-md-4">
          {displayTiles.map((tile) => (
            <div key={tile.id || tile.label} className="col-6 col-lg-3">
              <Link
                href={withLang(tile.href)}
                className="ss-lp-cat-card"
              >
                <div className="ss-lp-cat-card__img-wrap">
                  <StorefrontImage
                    sources={[tile.image]}
                    fallbackSrc="/img/hero.jpg"
                    width={450}
                    height={600}
                    alt={isEn ? tile.labelEn : tile.label}
                    className="ss-lp-cat-card__img"
                    sizes="(max-width: 575px) 50vw, (max-width: 991px) 50vw, 25vw"
                  />
                </div>
                <div className="ss-lp-cat-card__label-bar">
                  <h3 className="ss-lp-cat-card__name">
                    {isEn ? tile.labelEn : tile.label}
                  </h3>
                  <span className="ss-lp-cat-card__arrow">&rarr;</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
