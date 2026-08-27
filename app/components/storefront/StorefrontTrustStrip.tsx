import Link from "next/link";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type StorefrontTrustStripProps = {
  lang?: StorefrontLanguage;
  compact?: boolean;
};

export default function StorefrontTrustStrip({
  lang = "sr",
  compact = false,
}: StorefrontTrustStripProps) {
  const isEn = lang === "en";

  const trustItems = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <rect x="1" y="3" width="15" height="13" />
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      titleSr: "Besplatna Isporuka",
      titleEn: "Free Delivery",
      descSr: "Za sve porudžbine preko 15.000 RSD u celoj Srbiji",
      descEn: "Across Serbia on all orders over 15.000 RSD",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      ),
      titleSr: "Korekcija Po Meri",
      titleEn: "Tailored Adjustments",
      descSr: "Besplatne korekcije i fiting u našim salonima",
      descEn: "Free in-store alterations and fittings",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      ),
      titleSr: "Zamena & Povraćaj",
      titleEn: "14-Day Returns",
      descSr: "Jednostavna zamena veličine i sigurna kupovina",
      descEn: "Effortless exchange and money-back guarantee",
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      titleSr: "Showroom Niš & Kruševac",
      titleEn: "Showrooms Niš & Kruševac",
      descSr: "Stručni savet naših krojača i stilista",
      descEn: "Expert consultation by master tailors",
    },
  ];

  return (
    <section className={`luxury-trust-strip ${compact ? "py-3" : "py-4 py-lg-5"}`}>
      <div className="container">
        <div className="row g-3 g-lg-4">
          {trustItems.map((item) => (
            <div key={item.titleSr} className="col-6 col-lg-3">
              <div className="d-flex align-items-start gap-3 p-3 p-md-4 rounded-1 bg-dark text-white border border-secondary border-opacity-25 h-100">
                <div
                  className="flex-shrink-0 mt-1"
                  style={{ color: "var(--lux-gold, #c9a96e)" }}
                >
                  {item.icon}
                </div>
                <div>
                  <h4
                    className="text-uppercase fw-semibold mb-1"
                    style={{ fontSize: "0.84rem", letterSpacing: "0.12em", color: "var(--lux-fg, #f2eee7)" }}
                  >
                    {isEn ? item.titleEn : item.titleSr}
                  </h4>
                  <p
                    className="text-white-50 mb-0"
                    style={{ fontSize: "0.78rem", lineHeight: 1.45 }}
                  >
                    {isEn ? item.descEn : item.descSr}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
