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
  label: string;
  labelEn: string;
  href: string;
  image: string;
  terms: string[];
};

const FALLBACK_TILES: CategoryTile[] = [
  {
    label: "Odela",
    labelEn: "Suits",
    href: "/web-shop?categoryId=0",
    image: "/img/odela.jpg",
    terms: ["odel", "suit", "sako"],
  },
  {
    label: "Košulje",
    labelEn: "Shirts",
    href: "/web-shop",
    image: "/img/odela2.jpg",
    terms: ["košulj", "shirt"],
  },
  {
    label: "Kaputi",
    labelEn: "Coats",
    href: "/web-shop",
    image: "/img/hero.jpg",
    terms: ["kaput", "coat", "overcoat"],
  },
  {
    label: "Sakoi",
    labelEn: "Blazers",
    href: "/web-shop",
    image: "/img/hero2.jpg",
    terms: ["sako", "blazer", "jakn"],
  },
  {
    label: "Custom Suits",
    labelEn: "Custom Suits",
    href: "/custom-suits",
    image: "/img/odela.jpg",
    terms: [],
  },
];

const normalize = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const findCategoryHref = (categories: Category[], terms: string[]): string | null => {
  if (!terms.length) return null;
  const normalized = terms.map(normalize);
  const found = categories.find((cat) => {
    const vals = [cat.name, ...cat.path].map(normalize);
    return vals.some((v) => normalized.some((t) => v.includes(t)));
  });
  return found ? `/web-shop?categoryId=${found.id}` : null;
};

type Props = {
  categories: Category[];
  lang?: StorefrontLanguage;
};

export default function HomeCategoryTiles({ categories, lang = "sr" }: Props) {
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => {
    if (lang !== "en" || !href.startsWith("/")) return href;
    return href.includes("?") ? `${href}&lang=en` : `${href}?lang=en`;
  };

  const tiles = FALLBACK_TILES.map((tile) => {
    const resolved = findCategoryHref(categories, tile.terms);
    return {
      ...tile,
      href: resolved ? withLang(resolved) : withLang(tile.href),
      label: tx(tile.label, tile.labelEn),
    };
  });

  return (
    <section className="ss-category-strip">
      <div className="container">
        <p className="ss-category-strip__heading">
          {tx("Istraži kolekciju", "Explore the collection")}
        </p>
        <div className="ss-category-strip__track">
          {tiles.map((tile) => (
            <Link key={tile.label} href={tile.href} prefetch={false} className="ss-category-tile">
              <StorefrontImage
                sources={[tile.image]}
                fallbackSrc="/img/hero.jpg"
                width={280}
                height={390}
                alt={tile.label}
                className="ss-category-tile__img"
                sizes="(max-width: 575px) 58vw, (max-width: 991px) 30vw, 20vw"
              />
              <div className="ss-category-tile__overlay" aria-hidden="true" />
              <div className="ss-category-tile__label">
                <span className="ss-category-tile__name">{tile.label}</span>
                <span className="ss-category-tile__arrow">Pregledaj →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
