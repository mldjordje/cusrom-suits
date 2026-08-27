"use client";

import Link from "next/link";
import Image from "next/image";
import BlurText from "@/app/components/motion/BlurText";
import ShinyText from "@/app/components/motion/ShinyText";
import SpotlightCard from "@/app/components/motion/SpotlightCard";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

type Props = {
  lang?: StorefrontLanguage;
};

export default function AtelierHeritageShowcase({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => (isEn ? `${href}?lang=en` : href);

  const metrics = [
    { value: "2007", labelSr: "Godina Osnivanja", labelEn: "Founded In" },
    { value: "100%", labelSr: "Ručna Izrada & Fiting", labelEn: "Handcrafted Tailoring" },
    { value: "200+", labelSr: "Italijanskih Tkanina", labelEn: "Italian Mill Fabrics" },
    { value: "5.000+", labelSr: "Zadovoljnih Klijenata", labelEn: "Bespoke Clients" },
  ];

  return (
    <section className="luxury-atelier-heritage py-5 bg-black text-white position-relative overflow-hidden">
      <div className="container py-lg-4">
        {/* Header */}
        <div className="row mb-5 align-items-end">
          <div className="col-12 col-lg-8">
            <span className="lux-eyebrow mb-2">
              <ShinyText text={tx("SARTORIA & ATELIER NIŠ • OD 2007", "SARTORIA & ATELIER NIŠ • SINCE 2007")} />
            </span>
            <BlurText
              text={tx("Krojačka Umetnost i Bezvremenska Elegancija", "Art of Tailoring & Timeless Elegance")}
              as="h2"
              className="section-title text-uppercase mb-3 text-white"
            />
            <p className="text-white-50 mb-0" style={{ fontSize: "1.08rem", maxWidth: "640px" }}>
              {tx(
                "Svako Santos & Santorini odelo nastaje u rukama iskusnih majstora krojača. Od prvog uzimanja mera do finalnog šava, spajamo tradiciju italijanskog krojenja sa modernim stilom.",
                "Every Santos & Santorini garment is shaped by master tailors. From initial measurements to the final hand-stitch, we merge Italian sartorial heritage with contemporary silhouettes.",
              )}
            </p>
          </div>
          <div className="col-12 col-lg-4 text-lg-end mt-4 mt-lg-0">
            <Link
              href={withLang("/o-nama")}
              className="btn btn-outline-light text-uppercase px-4 py-3"
              style={{ fontSize: "0.82rem", letterSpacing: "0.16em" }}
            >
              {tx("Upoznajte Naš Atelier", "Discover Our Atelier")} &rarr;
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="row g-3 g-lg-4 mb-5">
          {metrics.map((m) => (
            <div key={m.value} className="col-6 col-lg-3">
              <SpotlightCard
                className="p-4 rounded-1 bg-dark border border-secondary border-opacity-25 text-center h-100"
                spotlightColor="rgba(201, 169, 110, 0.2)"
              >
                <div
                  className="font-display fw-bold mb-1"
                  style={{ fontSize: "clamp(2rem, 3.2vw, 2.8rem)", color: "var(--lux-gold, #c9a96e)", lineHeight: 1.1 }}
                >
                  {m.value}
                </div>
                <div
                  className="text-uppercase fw-medium text-white-50"
                  style={{ fontSize: "0.76rem", letterSpacing: "0.14em" }}
                >
                  {isEn ? m.labelEn : m.labelSr}
                </div>
              </SpotlightCard>
            </div>
          ))}
        </div>

        {/* Dual Atelier Locations */}
        <div className="row g-4 align-items-stretch">
          <div className="col-12 col-lg-6">
            <div className="p-4 p-md-5 rounded-1 bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column justify-content-between">
              <div>
                <span className="badge bg-black border border-secondary text-uppercase mb-3 px-3 py-2" style={{ letterSpacing: "0.16em", color: "var(--lux-gold, #c9a96e)" }}>
                  {tx("GLAVNI ATELIER & SALON", "MAIN ATELIER & SHOWROOM")}
                </span>
                <h3 className="h3 font-display text-uppercase mb-2 text-white">Niš • Obrenovićeva 9</h3>
                <p className="text-white-50 mb-4" style={{ fontSize: "0.95rem" }}>
                  {tx(
                    "Showroom i krojački atelier u srcu Niša. Kompletan asortiman odela, sakoa, tkanina za šivenje po meri i konsultacije sa stilistima.",
                    "Showroom and tailoring atelier in central Niš. Complete collection of suits, blazers, bespoke fabrics, and personalized fitting.",
                  )}
                </p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <a href="tel:+381694455106" className="btn btn-outline-light btn-sm text-uppercase px-3 py-2" style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                  +381 69 445 5106
                </a>
                <Link href={withLang("/kontakt")} className="btn btn-light btn-sm text-uppercase px-3 py-2 fw-bold" style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                  {tx("Zakaži Posetu", "Book Visit")}
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <div className="p-4 p-md-5 rounded-1 bg-dark border border-secondary border-opacity-25 h-100 d-flex flex-column justify-content-between">
              <div>
                <span className="badge bg-black border border-secondary text-uppercase mb-3 px-3 py-2" style={{ letterSpacing: "0.16em", color: "var(--lux-gold, #c9a96e)" }}>
                  {tx("PREMIUM SHOWROOM", "PREMIUM SHOWROOM")}
                </span>
                <h3 className="h3 font-display text-uppercase mb-2 text-white">Kruševac • Centar</h3>
                <p className="text-white-50 mb-4" style={{ fontSize: "0.95rem" }}>
                  {tx(
                    "Ekskluzivni izložbeni salon sa odabranim modelima aktuelne kolekcije, poslovnim uniformama i aksesoarima.",
                    "Exclusive showcase salon featuring selected ready-to-wear pieces, corporate uniforms, and luxury accessories.",
                  )}
                </p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <a href="tel:+381694455106" className="btn btn-outline-light btn-sm text-uppercase px-3 py-2" style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                  {tx("Informacije", "Information")}
                </a>
                <Link href={withLang("/prodajna-mesta")} className="btn btn-outline-light btn-sm text-uppercase px-3 py-2" style={{ fontSize: "0.78rem", letterSpacing: "0.12em" }}>
                  {tx("Sve Lokacije", "All Locations")} &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
