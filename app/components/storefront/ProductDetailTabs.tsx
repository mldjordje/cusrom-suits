"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import type {
  ProductDetailField,
  ProductSizeGuide,
  ProductWashCareItem,
} from "@/lib/storefront/product-details";

type Props = {
  lang?: StorefrontLanguage;
  description: string | null;
  specification: string | null;
  attributes: Array<[string, unknown]>;
  declaration: ProductDetailField[];
  sizeGuide: ProductSizeGuide;
  washCare: {
    title: string;
    note: string;
    items: ProductWashCareItem[];
  };
};

type TabKey = "description" | "declaration" | "care";

const safeHtml = (value: string | null) => ({
  __html:
    value && value.trim().length > 0
      ? value
      : "<p>Detaljan opis trenutno nije dostupan.</p>",
});

export default function ProductDetailTabs({
  lang = "sr",
  description,
  specification,
  attributes,
  declaration,
  sizeGuide,
  washCare,
}: Props) {
  const [tab, setTab] = useState<TabKey>("description");
  const { reduceMotion } = useAnimationBudget();
  const isEn = lang === "en";

  const additionalItems = useMemo(() => attributes.slice(0, 8), [attributes]);

  return (
    <div className="product-single__details-tab">
      <ul className="nav nav-tabs" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "description" ? "active" : ""}`}
            onClick={() => setTab("description")}
          >
            {isEn ? "Description" : "Opis"}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "declaration" ? "active" : ""}`}
            onClick={() => setTab("declaration")}
          >
            {isEn ? "Declaration & size guide" : "Deklaracija i veličine"}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "care" ? "active" : ""}`}
            onClick={() => setTab("care")}
          >
            {isEn ? "Wash care" : "Održavanje"}
          </button>
        </li>
      </ul>

      <div className="tab-content">
        <AnimatePresence mode="wait">
          {tab === "description" ? (
            <m.div
              key="description"
              className="tab-pane fade show active"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="product-single__description">
                <h3 className="block-title mb-4">{isEn ? "Product details" : "Detalji proizvoda"}</h3>
                <div className="content" dangerouslySetInnerHTML={safeHtml(description)} />
                <h3 className="block-title mb-0">{isEn ? "Material and specification" : "Materijal i specifikacija"}</h3>
                <div className="content" dangerouslySetInnerHTML={safeHtml(specification)} />
              </div>
            </m.div>
          ) : null}

          {tab === "declaration" ? (
            <m.div
              key="declaration"
              className="tab-pane fade show active"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="product-single__description">
                <h3 className="block-title mb-3">{isEn ? "Declaration" : "Deklaracija"}</h3>
                <div className="row g-4">
                  <div className="col-lg-6">
                    <ul className="list text-list mb-0">
                      {declaration.map((item) => (
                        <li key={item.label}>
                          <strong>{item.label}:</strong> {item.value}
                        </li>
                      ))}
                      {additionalItems.map(([key, value]) => (
                        <li key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="col-lg-6">
                    <h4 className="h6 text-uppercase mb-3">{sizeGuide.title}</h4>
                    <p>{sizeGuide.intro}</p>
                    <ul className="list text-list mb-0">
                      {sizeGuide.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </m.div>
          ) : null}

          {tab === "care" ? (
            <m.div
              key="care"
              className="tab-pane fade show active"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="product-single__description">
                <h3 className="block-title mb-3">{washCare.title}</h3>
                <div className="row g-3 mb-3">
                  {washCare.items.map((item) => (
                    <div key={item.title} className="col-sm-6 col-xl-3">
                      <div className="border rounded-4 h-100 p-3 text-center">
                        <div
                          className="d-inline-flex align-items-center justify-content-center rounded-circle border mb-3 fw-semibold"
                          style={{ width: 64, height: 64, fontSize: 16 }}
                        >
                          {item.symbol}
                        </div>
                        <h4 className="h6 text-uppercase mb-2">{item.title}</h4>
                        <p className="small text-secondary mb-0">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="small text-secondary mb-0">{washCare.note}</p>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
