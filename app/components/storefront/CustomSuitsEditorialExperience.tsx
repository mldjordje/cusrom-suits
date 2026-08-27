"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import BlurText from "@/app/components/motion/BlurText";
import ShinyText from "@/app/components/motion/ShinyText";
import SpotlightCard from "@/app/components/motion/SpotlightCard";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

type Props = {
  lang?: StorefrontLanguage;
  backgroundImage?: string;
};

const PILLARS = [
  {
    step: "01",
    titleSr: "Italijanske Tkanine & Vuna",
    titleEn: "Italian Fabrics & Pure Wool",
    descSr: "Preko 200 prestižnih tkanina vodećih italijanskih tkaonica: Vitale Barberis Canonico, Cerruti, Reda i Loro Piana. Čista vuna od Super 110s do Super 180s i kašmir.",
    descEn: "Over 200 prestigious fabrics from leading Italian mills: Vitale Barberis Canonico, Cerruti, Reda, and Loro Piana. Pure wool from Super 110s to Super 180s and cashmere.",
    tagSr: "100% VUNA • KAŠMIR • SVILA",
    tagEn: "100% WOOL • CASHMERE • SILK",
    image: "/img/odela2.jpg",
    specs: {
      mill: "Vitale Barberis Canonico & Loro Piana",
      composition: "100% Virgin Wool / Silk & Cashmere",
      weight: "250g - 340g / m²",
      origin: "Biella, Piemonte — Italy",
    },
    hotspot: { x: 38, y: 35, labelSr: "Ručni AMF štep i rever 9.5cm", labelEn: "Handmade AMF pick stitching & 9.5cm lapel" },
  },
  {
    step: "02",
    titleSr: "Personalizovana Silueta",
    titleEn: "Personalized Silhouette",
    descSr: "Potpuna sloboda u dizajnu svakog detalja: jednoredno ili dvoredno kopčanje, špicasti ili standardni reveri, prirodna dugmad od roga, personalizovana postava i vaš monogram.",
    descEn: "Complete freedom in designing every single detail: single or double-breasted, peak or notch lapels, genuine horn buttons, bespoke lining, and personalized monogram.",
    tagSr: "FITING PO VAŠOJ MERI",
    tagEn: "TAILORED TO YOUR FIT",
    image: "/img/hero2.jpg",
    specs: {
      mill: "Santos & Santorini Sartoria",
      composition: "Anatomski kroj i meko rame",
      weight: "Polu-platno ili Puno-platno (Full Canvas)",
      origin: "Atelier Niš & Kruševac",
    },
    hotspot: { x: 52, y: 48, labelSr: "Prirodna dugmad od roga i sedefa", labelEn: "Natural horn & mother-of-pearl buttons" },
  },
  {
    step: "03",
    titleSr: "Majstorska Ručna Izrada",
    titleEn: "Master Handcrafted Tailoring",
    descSr: "Iskusni majstori krojači u našem atelieru u Nišu prenose decenije tradicije u svaki šav, garantujući savršen pad odela, postojanost forme i neprikosnovenu udobnost.",
    descEn: "Experienced master tailors in our Niš atelier pour decades of heritage into every stitch, ensuring a flawless drape, long-lasting structure, and unmatched comfort.",
    tagSr: "ATELIER TRADICIJA OD 2007",
    tagEn: "ATELIER HERITAGE SINCE 2007",
    image: "/img/hero.jpg",
    specs: {
      mill: "Bespoke & Made to Measure",
      composition: "Višestepene probe i fiting",
      weight: "Garantovano savršeno pristajanje",
      origin: "Showroom Niš, Obrenovićeva 9",
    },
    hotspot: { x: 45, y: 28, labelSr: "Spalla Camicia meko italijansko rame", labelEn: "Spalla Camicia soft Italian shoulder" },
  },
];

const FABRICS = [
  { id: "vbc-navy", name: "VBC Navy Pinstripe", code: "Super 130s Pure Wool", color: "#1a2536" },
  { id: "charcoal-shark", name: "Reda Charcoal Sharkskin", code: "Super 150s Wool", color: "#2d3033" },
  { id: "midnight-tux", name: "Cerruti Midnight Satin", code: "Wool & Silk Blend", color: "#121317" },
  { id: "camel-cashmere", name: "Loro Piana Camel", code: "Cashmere & Virgin Wool", color: "#876c4e" },
];

export default function CustomSuitsEditorialExperience({ lang = "sr" }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeFabric, setActiveFabric] = useState(0);
  const [showHotspot, setShowHotspot] = useState(true);

  const isEn = lang === "en";
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => (isEn ? `${href}?lang=en` : href);

  const activePillar = PILLARS[activeTab] || PILLARS[0];

  return (
    <section className="luxury-custom-suits-experience py-5 position-relative overflow-hidden">
      <div className="container py-lg-4">
        {/* Section Header */}
        <div className="row mb-5 align-items-end">
          <div className="col-12 col-lg-8">
            <span className="lux-eyebrow mb-2">
              <ShinyText text={tx("MADE TO MEASURE • ŠIVENJE PO MERI", "MADE TO MEASURE • BESPOKE TAILORING")} />
            </span>
            <BlurText
              text={tx("Kreirajte Odelo Skrojeno Isključivo Za Vas", "Craft a Suit Tailored Exclusively for You")}
              as="h2"
              className="section-title text-uppercase mb-3"
            />
            <p className="text-secondary mb-0" style={{ fontSize: "1.1rem", maxWidth: "620px" }}>
              {tx(
                "Spoj bezvremenske italijanske elegancije, vrhunskih materijala i majstorske ručne izrade. Odelo koje nosi vaš lični pečat.",
                "The fusion of timeless Italian elegance, world-class fabrics, and artisanal craftsmanship. A suit that bears your personal signature.",
              )}
            </p>
          </div>
          <div className="col-12 col-lg-4 text-lg-end mt-4 mt-lg-0">
            <Link
              href={withLang("/custom-suits")}
              className="btn btn-dark fw-semi-bold text-uppercase px-4 py-3 ss-cta-btn ss-cta-btn--primary"
            >
              {tx("Otvori 3D Konfigurator", "Launch 3D Configurator")} &rarr;
            </Link>
          </div>
        </div>

        {/* Interactive Editorial Showcase */}
        <div className="row g-4 g-lg-5 align-items-stretch">
          {/* Left: Step Cards / Tabs & Fabric Swatches */}
          <div className="col-12 col-lg-5 order-2 order-lg-1 d-flex flex-column justify-content-between">
            <div className="d-flex flex-column gap-3">
              {PILLARS.map((pillar, idx) => {
                const isActive = activeTab === idx;
                return (
                  <SpotlightCard
                    key={pillar.step}
                    className={`p-3 p-md-4 rounded-1 transition-all ${
                      isActive ? "bg-dark text-white border-gold shadow-lg" : "bg-light text-dark border"
                    }`}
                    spotlightColor={isActive ? "rgba(201, 169, 110, 0.2)" : "rgba(0, 0, 0, 0.05)"}
                  >
                    <div
                      onClick={() => setActiveTab(idx)}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer"
                      style={{ outline: "none" }}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span
                          className="fw-bold"
                          style={{
                            color: isActive ? "var(--lux-gold, #c9a96e)" : "#888",
                            letterSpacing: "0.15em",
                            fontSize: "0.85rem",
                          }}
                        >
                          {pillar.step}
                        </span>
                        <span
                          className="text-uppercase fw-semibold"
                          style={{
                            fontSize: "0.72rem",
                            letterSpacing: "0.18em",
                            color: isActive ? "var(--lux-gold-bright, #e3c88f)" : "#666",
                          }}
                        >
                          {isEn ? pillar.tagEn : pillar.tagSr}
                        </span>
                      </div>
                      <h3 className="h5 text-uppercase mb-2 font-display" style={{ color: isActive ? "#fff" : "#111" }}>
                        {isEn ? pillar.titleEn : pillar.titleSr}
                      </h3>
                      <p
                        className="mb-0"
                        style={{
                          fontSize: "0.94rem",
                          lineHeight: 1.55,
                          color: isActive ? "#d8d3cb" : "#555",
                        }}
                      >
                        {isEn ? pillar.descEn : pillar.descSr}
                      </p>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>

            {/* Interactive Fabric Selector Bar */}
            <div className="p-3 bg-dark border border-secondary border-opacity-25 rounded-1 mt-4">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-uppercase fw-semibold" style={{ fontSize: "0.72rem", letterSpacing: "0.14em", color: "var(--lux-gold, #c9a96e)" }}>
                  {tx("IZBOR ITALIJANSKIH TKANINA", "ITALIAN FABRIC SELECTION")}
                </span>
                <span className="text-white-50" style={{ fontSize: "0.75rem" }}>
                  {FABRICS[activeFabric].code}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                {FABRICS.map((fabric, fIdx) => (
                  <button
                    key={fabric.id}
                    type="button"
                    onClick={() => setActiveFabric(fIdx)}
                    className={`d-flex align-items-center gap-2 px-3 py-2 rounded-1 border text-white transition-all ${
                      activeFabric === fIdx ? "border-gold bg-black" : "border-secondary border-opacity-25 bg-dark opacity-75"
                    }`}
                    style={{ flex: 1, fontSize: "0.76rem" }}
                  >
                    <span
                      className="rounded-circle flex-shrink-0"
                      style={{ width: "12px", height: "12px", backgroundColor: fabric.color, border: "1px solid rgba(255,255,255,0.4)" }}
                    />
                    <span className="text-truncate fw-medium">{fabric.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 mt-4 pt-2">
              <Link
                href={withLang("/kontakt")}
                className="btn btn-outline-dark text-uppercase px-4 py-2"
                style={{ fontSize: "0.82rem", letterSpacing: "0.14em" }}
              >
                {tx("Zakažite Fiting u Salonu", "Book Atelier Appointment")}
              </Link>
              <Link
                href={withLang("/custom-suits")}
                className="btn-link default-underline text-uppercase fw-medium"
                style={{ fontSize: "0.82rem", letterSpacing: "0.12em" }}
              >
                {tx("Otvori Konfigurator", "Launch 3D Configurator")} &rarr;
              </Link>
            </div>
          </div>

          {/* Right: Big Editorial Visual Stage with Interactive Hotspot */}
          <div className="col-12 col-lg-7 order-1 order-lg-2">
            <div
              className="position-relative overflow-hidden rounded-2 shadow-2xl h-100"
              style={{ minHeight: "560px", backgroundColor: "#121110" }}
            >
              <Image
                src={activePillar.image}
                alt={isEn ? activePillar.titleEn : activePillar.titleSr}
                fill
                sizes="(max-width: 991px) 100vw, 55vw"
                style={{
                  objectFit: "cover",
                  objectPosition: "center top",
                  transition: "opacity 0.6s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                priority={false}
              />
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%)",
                }}
              />

              {/* Craftsmanship Hotspot */}
              {activePillar.hotspot && (
                <div
                  className="position-absolute"
                  style={{
                    top: `${activePillar.hotspot.y}%`,
                    left: `${activePillar.hotspot.x}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 5,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowHotspot(!showHotspot)}
                    className="btn-icon rounded-circle d-flex align-items-center justify-content-center border border-white"
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "rgba(201, 169, 110, 0.85)",
                      boxShadow: "0 0 16px rgba(201, 169, 110, 0.8)",
                      animation: "ss-pulse-hotspot 2s infinite",
                    }}
                    aria-label="Detail hotspot"
                  >
                    <span className="fw-bold text-dark" style={{ fontSize: "14px" }}>+</span>
                  </button>
                  {showHotspot && (
                    <div
                      className="position-absolute p-2 px-3 bg-black text-white border border-secondary rounded-1 shadow-lg mt-2"
                      style={{
                        width: "max-content",
                        maxWidth: "240px",
                        fontSize: "0.78rem",
                        letterSpacing: "0.04em",
                        transform: "translateX(-20%)",
                      }}
                    >
                      <span style={{ color: "var(--lux-gold, #c9a96e)" }}>◆ </span>
                      {isEn ? activePillar.hotspot.labelEn : activePillar.hotspot.labelSr}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Specs Overlay */}
              <div className="position-absolute bottom-0 start-0 p-4 p-md-5 text-white w-100">
                <span
                  className="badge bg-dark border border-secondary text-uppercase mb-2 px-3 py-2"
                  style={{ letterSpacing: "0.15em", fontSize: "0.72rem", color: "var(--lux-gold, #c9a96e)" }}
                >
                  {isEn ? activePillar.tagEn : activePillar.tagSr}
                </span>
                <h3 className="h2 font-display text-uppercase mb-2 text-white">
                  {isEn ? activePillar.titleEn : activePillar.titleSr}
                </h3>
                <p className="text-white-50 mb-3" style={{ maxWidth: "480px", fontSize: "0.95rem" }}>
                  {isEn ? activePillar.descEn : activePillar.descSr}
                </p>

                {/* Specs Strip */}
                <div className="d-flex flex-wrap gap-3 pt-3 border-top border-secondary border-opacity-25" style={{ fontSize: "0.76rem" }}>
                  <div>
                    <span className="text-white-50 d-block">{tx("Tkaonica", "Mill")}:</span>
                    <strong className="text-white">{activePillar.specs.mill}</strong>
                  </div>
                  <div>
                    <span className="text-white-50 d-block">{tx("Sastav", "Fabric")}:</span>
                    <strong className="text-white">{activePillar.specs.composition}</strong>
                  </div>
                  <div>
                    <span className="text-white-50 d-block">{tx("Konstrukcija", "Construction")}:</span>
                    <strong className="text-white">{activePillar.specs.weight}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
