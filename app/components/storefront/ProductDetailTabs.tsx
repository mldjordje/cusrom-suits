"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import { decodeHtmlEntities } from "@/lib/catalog/presentation";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import type {
  ProductDetailField,
  ProductSizeGuide,
  ProductWashCareIcon,
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

/** ISO 3758 wash care symbols rendered as inline SVG */
const WashCareSymbol = ({ icon }: { icon: ProductWashCareIcon }) => {
  const s = 1.6; // stroke width

  if (icon === "gentleWash") {
    // Washtub with 30 inside + two underlines = gentle 30°C wash
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ss-care-svg">
        <path d="M6 16 Q6 10 12 10 H36 Q42 10 42 16 L38 36 H10 Z" stroke="currentColor" strokeWidth={s} strokeLinejoin="round" />
        <text x="24" y="28" textAnchor="middle" fontSize="11" fontFamily="inherit" fill="currentColor" fontWeight="600">30°</text>
        <line x1="6" y1="40" x2="42" y2="40" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        <line x1="6" y1="44" x2="42" y2="44" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "dryCleaning") {
    // Circle with letter P = professional dry clean
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ss-care-svg">
        <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth={s} />
        <text x="24" y="30" textAnchor="middle" fontSize="18" fontFamily="inherit" fill="currentColor" fontWeight="700">P</text>
      </svg>
    );
  }

  if (icon === "doNotBleach") {
    // Triangle (bleach) crossed out
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ss-care-svg">
        <path d="M24 6 L42 42 H6 Z" stroke="currentColor" strokeWidth={s} strokeLinejoin="round" />
        <line x1="12" y1="14" x2="36" y2="38" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        <line x1="36" y1="14" x2="12" y2="38" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "lowIron") {
    // Iron silhouette with one dot = low temperature
    return (
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ss-care-svg">
        <path d="M6 30 L6 22 Q6 16 16 16 L38 16 Q44 16 44 22 L44 30 Q44 34 40 34 L10 34 Q6 34 6 30 Z" stroke="currentColor" strokeWidth={s} strokeLinejoin="round" />
        <line x1="6" y1="34" x2="6" y2="40" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
        <circle cx="27" cy="25" r="2.2" fill="currentColor" />
      </svg>
    );
  }

  // noTumbleDry — square with circle crossed out
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="ss-care-svg">
      <rect x="6" y="6" width="36" height="36" rx="3" stroke="currentColor" strokeWidth={s} />
      <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth={s} />
      <line x1="14" y1="14" x2="34" y2="34" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
      <line x1="34" y1="14" x2="14" y2="34" stroke="currentColor" strokeWidth={s} strokeLinecap="round" />
    </svg>
  );
};

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

  const additionalItems = useMemo(() => attributes.slice(0, 8), [attributes]);

  return (
    <div className="product-single__details-tab ss-product-glass-card">
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
            {isEn ? "Declaration" : "Deklaracija"}
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
                <h3 className="block-title mb-3">{isEn ? "Declaration" : "Deklaracija"}</h3>
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
