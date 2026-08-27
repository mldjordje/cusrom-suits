"use client";

import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

export type ProductItem = {
  id: string | number;
  title: string;
  categoryName?: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  image: string;
  hoverImage?: string;
  href: string;
  badge?: "novo" | "akcija" | "kolekcija" | string | null;
};

type Props = {
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  viewAllText?: string;
  products: ProductItem[];
  theme?: "light" | "dark";
};

export default function LandingFeaturedProducts({
  eyebrow = "SELEKCIJA",
  title = "Izdvojeni Modeli",
  viewAllHref = "/web-shop",
  viewAllText = "Pogledaj Sve →",
  products,
  theme = "light",
}: Props) {
  const isDark = theme === "dark";

  if (!products || products.length === 0) return null;

  return (
    <section className={`ss-lp-products-section ${isDark ? "bg-black text-white" : ""}`}>
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-4 pb-2 border-bottom border-secondary border-opacity-25">
          <div>
            <span className="ss-lp-eyebrow mb-2">{eyebrow}</span>
            <h2 className={`ss-lp-title ${isDark ? "ss-lp-title--dark text-white" : "ss-lp-title--light"} m-0 fs-1`}>
              {title}
            </h2>
          </div>
          {viewAllHref && (
            <Link href={viewAllHref} className="ss-lp-btn-link mt-3 mt-md-0">
              {viewAllText}
            </Link>
          )}
        </div>

        {/* Responsive Grid */}
        <div className="row g-3 g-md-4">
          {products.slice(0, 8).map((product) => {
            const hasDiscount = Boolean(product.compareAtPrice);

            return (
              <div key={product.id} className="col-6 col-md-4 col-lg-3">
                <Link href={product.href} className="ss-lp-product-card">
                  <div className="ss-lp-product-card__img-wrap">
                    {/* Badge */}
                    {product.badge && (
                      <span
                        className={`ss-lp-product-card__badge ${
                          product.badge.toLowerCase() === "akcija"
                            ? "ss-lp-product-card__badge--sale"
                            : "ss-lp-product-card__badge--new"
                        }`}
                      >
                        {product.badge}
                      </span>
                    )}

                    {/* Primary Image */}
                    <StorefrontImage
                      sources={[product.image]}
                      fallbackSrc="/img/hero.jpg"
                      width={450}
                      height={600}
                      alt={product.title}
                      className="ss-lp-product-card__img ss-lp-product-card__img--primary"
                      sizes="(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw"
                    />

                    {/* Hover Image */}
                    {product.hoverImage && (
                      <StorefrontImage
                        sources={[product.hoverImage]}
                        fallbackSrc={product.image}
                        width={450}
                        height={600}
                        alt={`${product.title} alternate`}
                        className="ss-lp-product-card__img ss-lp-product-card__img--hover"
                        sizes="(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw"
                      />
                    )}

                    {/* Hover Overlay */}
                    <div className="ss-lp-product-card__overlay">
                      <span className="ss-lp-product-card__overlay-text">
                        Istraži Model &rarr;
                      </span>
                    </div>
                  </div>

                  {/* Card Info */}
                  <div className="ss-lp-product-card__info">
                    {product.categoryName && (
                      <div className="ss-lp-product-card__category">
                        {product.categoryName}
                      </div>
                    )}
                    <h3 className={`ss-lp-product-card__title ${isDark ? "text-white" : ""}`}>
                      {product.title}
                    </h3>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`ss-lp-product-card__price ${isDark ? "text-white" : ""}`}>
                        {typeof product.price === "number"
                          ? `${product.price.toLocaleString("sr-RS")} RSD`
                          : product.price}
                      </span>
                      {hasDiscount && (
                        <span className="text-muted text-decoration-line-through small">
                          {typeof product.compareAtPrice === "number"
                            ? `${product.compareAtPrice.toLocaleString("sr-RS")} RSD`
                            : product.compareAtPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
