import Link from "next/link";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import {
  getCatalogProductImageSources,
  getLocalizedCatalogProductName,
} from "@/lib/storefront/product-details";
import type { CatalogProductView } from "@/lib/catalog/store";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type Props = {
  lang: StorefrontLanguage;
  products: CatalogProductView[];
};

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function CompleteTheLook({ lang, products }: Props) {
  if (!products || products.length === 0) return null;
  const isEn = lang === "en";
  const withLang = (path: string) => (isEn ? `${path}${path.includes("?") ? "&" : "?"}lang=en` : path);

  return (
    <Reveal as="section" className="products-carousel container mt-5 pt-4 ss-related-products" delay={0.08}>
      <div className="ss-related-products__header">
        <div>
          <p className="ss-related-products__eyebrow">{isEn ? "Complete the look" : "Upotpuni izgled"}</p>
          <h2 className="h3 text-uppercase mb-0">
            {isEn ? "Styled " : "Uskladjeno "}
            <strong>{isEn ? "for you" : "za vas"}</strong>
          </h2>
        </div>
        <p className="ss-related-products__copy">
          {isEn
            ? "Hand-picked pieces that pair perfectly with your selection."
            : "Pazljivo odabrani komadi koji savrseno idu uz vas izbor."}
        </p>
      </div>
      <div className="row row-cols-2 row-cols-md-4">
        {products.map((item) => {
          const imageSources = getCatalogProductImageSources(item, [], ["/img/odela2.jpg"]);
          const cover = imageSources[0] || "/img/odela2.jpg";
          const second = imageSources[1] || cover;
          const name = getLocalizedCatalogProductName(item, lang);
          const href = withLang(`/web-shop/${item.legacyId}`);
          return (
            <div key={item.legacyId} className="product-card-wrapper">
              <div className="product-card ss-card-hover ss-product-card mb-3 mb-md-4">
                <div className="pc__img-wrapper hover-container">
                  <Link href={href}>
                    <StorefrontSmartImage
                      sources={[cover]}
                      width={330}
                      height={400}
                      alt={name}
                      className="pc__img"
                      sizes="(max-width: 767px) 50vw, 25vw"
                      quality={70}
                    />
                    <StorefrontSmartImage
                      sources={[second, cover]}
                      width={330}
                      height={400}
                      alt={`${name} preview`}
                      className="pc__img pc__img-second"
                      sizes="(max-width: 767px) 50vw, 25vw"
                      quality={60}
                    />
                  </Link>
                </div>
                <div className="pc__info position-relative">
                  <h6 className="pc__title">
                    <Link href={href}>{name}</Link>
                  </h6>
                  <div className="product-card__price d-flex">
                    <span className="money price">{formatRsd(Number(item.priceFinalGross || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}
