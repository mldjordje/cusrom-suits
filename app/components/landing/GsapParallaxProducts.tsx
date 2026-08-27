"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { ProductItem } from "./LandingFeaturedProducts";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

type Props = {
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  viewAllText?: string;
  products: ProductItem[];
  theme?: "light" | "dark";
};

export default function GsapParallaxProducts({
  eyebrow = "SELEKCIJA",
  title = "Izdvojeni Modeli",
  viewAllHref = "/web-shop",
  viewAllText = "Pogledaj Sve →",
  products,
  theme = "light",
}: Props) {
  const isDark = theme === "dark";
  const sectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!gridRef.current) return;
      const cards = gridRef.current.querySelectorAll(".ss-lp-product-card");

      gsap.fromTo(
        cards,
        { y: 40, opacity: 0.2 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.06,
          duration: 0.65,
          ease: "power2.out",
          scrollTrigger: {
            trigger: gridRef.current,
            start: "top 95%",
            toggleActions: "play none none none",
          },
        },
      );
    },
    { scope: sectionRef },
  );

  if (!products || products.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className={`ss-lp-products-section ${isDark ? "bg-black text-white" : ""}`}
    >
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-4 pb-2 border-bottom border-secondary border-opacity-25">
          <div>
            <span className="ss-lp-eyebrow mb-2">{eyebrow}</span>
            <h2
              className={`ss-lp-title ${
                isDark ? "ss-lp-title--dark text-white" : "ss-lp-title--light"
              } m-0 fs-1`}
            >
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
        <div ref={gridRef} className="row g-3 g-md-4">
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
                    <Image
                      src={product.image}
                      alt={product.title}
                      fill
                      className="ss-lp-product-card__img ss-lp-product-card__img--primary object-fit-cover"
                      sizes="(max-width: 575px) 50vw, (max-width: 991px) 33vw, 25vw"
                    />

                    {/* Hover Image */}
                    {product.hoverImage && (
                      <Image
                        src={product.hoverImage}
                        alt={`${product.title} alternate`}
                        fill
                        className="ss-lp-product-card__img ss-lp-product-card__img--hover object-fit-cover"
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
                    <h3
                      className={`ss-lp-product-card__title ${
                        isDark ? "text-white" : ""
                      }`}
                    >
                      {product.title}
                    </h3>
                    <div className="d-flex align-items-center gap-2">
                      <span
                        className={`ss-lp-product-card__price ${
                          isDark ? "text-white" : ""
                        }`}
                      >
                        {typeof product.price === "number"
                          ? `${product.price.toLocaleString("sr-RS")} RSD`
                          : product.price}
                      </span>
                      {hasDiscount && (
                        <span className="text-muted text-decoration-line-through small">
                          {typeof product.compareAtPrice === "number"
                            ? `${product.compareAtPrice.toLocaleString(
                                "sr-RS",
                              )} RSD`
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
