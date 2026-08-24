import Link from "next/link";
import { getSiteContent } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type StorefrontTrustStripProps = {
  lang?: StorefrontLanguage;
  compact?: boolean;
};

export default async function StorefrontTrustStrip({
  lang = "sr",
  compact = false,
}: StorefrontTrustStripProps) {
  const isEn = lang === "en";
  const primaryStore = (await getSiteContent()).stores[0];
  const items = [
    {
      title: isEn ? "Showroom support" : "Showroom podrska",
      body: isEn
        ? `Need help? Visit ${primaryStore?.cityEn || primaryStore?.city || "our store"} or call us for quick guidance.`
        : `Ako zatreba pomoc, posetite ${primaryStore?.city || "radnju"} ili nas pozovite za brz savet.`,
    },
    {
      title: isEn ? "Documents and policies" : "Dokumenta i pravila",
      body: isEn
        ? "Consumer rights, return forms and buying guidance are available in one place."
        : "Prava potrosaca, formulari i uputstva za kupovinu dostupni su na jednom mestu.",
    },
  ];

  return (
    <section className={`container ${compact ? "py-3" : "py-4 py-lg-5"}`}>
      <div
        className="border bg-white"
        style={{ borderRadius: compact ? 20 : 24, padding: compact ? "1rem" : "1.5rem" }}
      >
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
          <div>
            <p
              className="text-uppercase mb-2"
              style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
            >
              {isEn ? "Why shop here" : "Zasto kupovati ovde"}
            </p>
            <h2 className="h4 text-uppercase mb-0">
              {isEn ? "A cleaner buying flow with " : "Cistiji tok kupovine uz "}
              <strong>{isEn ? "real team support" : "pravu podrsku tima"}</strong>
            </h2>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link href={isEn ? "/kontakt?lang=en" : "/kontakt"} className="btn btn-dark btn-sm text-uppercase fw-medium">
              {isEn ? "Contact team" : "Kontaktiraj tim"}
            </Link>
            <Link
              href={isEn ? "/dokumenta?lang=en" : "/dokumenta"}
              className="btn btn-outline-dark btn-sm text-uppercase fw-medium"
            >
              {isEn ? "Open documents" : "Otvori dokumenta"}
            </Link>
          </div>
        </div>

        <div className="row g-3">
          {items.map((item) => (
            <div key={item.title} className="col-12 col-lg-6">
              <div className="border h-100 px-3 py-3" style={{ borderRadius: 18 }}>
                <p
                  className="text-uppercase fw-medium mb-2"
                  style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}
                >
                  {item.title}
                </p>
                <p className="text-secondary mb-0">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
