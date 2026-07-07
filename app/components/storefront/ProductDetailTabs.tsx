"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import WashCareSymbol from "@/app/components/wash-care/WashCareSymbol";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
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
  sizeGuide: ProductSizeGuide | null;
  washCare: {
    title: string;
    note: string;
    items: ProductWashCareItem[];
  };
};

type TabKey = "description" | "declaration" | "care";

const fallbackHtml = {
  sr: "<p>Detaljan opis trenutno nije dostupan.</p>",
  en: "<p>Detailed description is currently unavailable.</p>",
};

const safeHtml = (value: string | null, lang: StorefrontLanguage) => ({
  __html:
    value && value.trim().length > 0
      ? decodeHtmlEntities(value)
      : fallbackHtml[lang],
});

export default function ProductDetailTabs({
  lang = "sr",
  description,
  specification,
  attributes,
  declaration,
  washCare,
}: Props) {
  const [tab, setTab] = useState<TabKey>("description");
  const { reduceMotion } = useAnimationBudget();
  const isEn = lang === "en";
  const hasWashCare = washCare.items.length > 0;

  const additionalItems = useMemo(() => attributes.slice(0, 8), [attributes]);

  return (
    <div className="product-single__details-tab ss-product-glass-card">
      <ul className="nav nav-tabs" role="tablist">
        {hasWashCare ? <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "description" ? "active" : ""}`}
            onClick={() => setTab("description")}
          >
            {isEn ? "Description" : "Opis"}
          </button>
        </li> : null}
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "declaration" ? "active" : ""}`}
            onClick={() => setTab("declaration")}
          >
            {isEn ? "Country of origin" : "Zemlja porekla"}
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            type="button"
            className={`nav-link nav-link_underscore ${tab === "care" ? "active" : ""}`}
            onClick={() => setTab("care")}
          >
            {isEn ? "Wash care" : "Odrzavanje"}
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
                <div className="content" dangerouslySetInnerHTML={safeHtml(description, lang)} />
                <h3 className="block-title mb-0">{isEn ? "Material and specification" : "Materijal i specifikacija"}</h3>
                <div className="content" dangerouslySetInnerHTML={safeHtml(specification, lang)} />
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
                <h3 className="block-title mb-3">{isEn ? "Country of origin" : "Zemlja porekla"}</h3>
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
            </m.div>
          ) : null}

          {hasWashCare ? (tab === "care" ? (
            <m.div
              key="care"
              className="tab-pane fade show active"
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="product-single__description">
                <div className="ss-care-strip">
                  {washCare.items.map((item) => (
                    <div key={item.icon} className="ss-care-strip__item" title={item.description}>
                      <WashCareSymbol icon={item.icon} />
                      <span className="ss-care-strip__label">{item.title}</span>
                    </div>
                  ))}
                </div>
                <p className="ss-care-note">{washCare.note}</p>
              </div>
            </m.div>
          ) : null) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
