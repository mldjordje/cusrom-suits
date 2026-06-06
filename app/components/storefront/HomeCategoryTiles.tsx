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
};

const CATEGORY_TILES: CategoryTile[] = [
  {
    label: "Odela",
    labelEn: "Suits",
    href: "/web-shop?categoryGroup=odelo",
    image: "/img/odela.jpg",
  },
  {
    label: "Sakoi",
    labelEn: "Blazers",
    href: "/web-shop?categoryGroup=sako",
    image: "/img/hero2.jpg",
  },
  {
    label: "Pantalone",
    labelEn: "Trousers",
    href: "/web-shop?categoryGroup=pantalone",
    image: "/img/odela2.jpg",
  },
  {
    label: "Kosulje",
    labelEn: "Shirts",
    href: "/web-shop?categoryGroup=kosulja",
    image: "/img/hero.jpg",
  },
  {
    label: "Custom Suits",
    labelEn: "Custom Suits",
    href: "/custom-suits",
    image: "/img/odela.jpg",
  },
];

type Props = {
  categories: Category[];
  categoryGroupImages?: Record<string, string>;
  lang?: StorefrontLanguage;
};

export default function HomeCategoryTiles({ categories: _categories, categoryGroupImages, lang = "sr" }: Props) {
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => {
    if (lang !== "en" || !href.startsWith("/")) return href;
    return href.includes("?") ? `${href}&lang=en` : `${href}?lang=en`;
  };

  const tiles = CATEGORY_TILES.map((tile) => {
    const groupKey = new URLSearchParams(tile.href.split("?")[1] || "").get("categoryGroup") || "";
    const liveImage = groupKey && categoryGroupImages?.[groupKey];
    return {
      ...tile,
      href: withLang(tile.href),
      label: tx(tile.label, tile.labelEn),
      image: liveImage || tile.image,
    };
  });

  return (
    <section className="ss-category-strip">
      <div className="container">
        <p className="ss-category-strip__heading">
          {tx("Istrazi kolekciju", "Explore the collection")}
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
                <span className="ss-category-tile__arrow">{tx("Pregledaj", "View")} -&gt;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
