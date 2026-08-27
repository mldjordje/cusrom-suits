"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import BlurText from "@/app/components/motion/BlurText";
import ShinyText from "@/app/components/motion/ShinyText";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

type LookbookItem = {
  id: string;
  seasonSr: string;
  seasonEn: string;
  titleSr: string;
  titleEn: string;
  taglineSr: string;
  taglineEn: string;
  image: string;
  href: string;
};

const LOOKS: LookbookItem[] = [
  {
    id: "look-1",
    seasonSr: "KAMPANJA 2026",
    seasonEn: "CAMPAIGN 2026",
    titleSr: "Italijanska Vuna & Dvoredni Kroj",
    titleEn: "Italian Wool & Double Breasted",
    taglineSr: "Besprijekorna silueta sa špicastim reverima i ručno šivenim detaljima.",
    taglineEn: "Impeccable silhouette with peak lapels and hand-stitched detailing.",
    image: "/img/odela.jpg",
    href: "/web-shop?categoryGroup=odelo",
  },
  {
    id: "look-2",
    seasonSr: "ELEGANT TRAVEL",
    seasonEn: "ELEGANT TRAVEL",
    titleSr: "Moderni Sakoi & Lagana Struktura",
    titleEn: "Contemporary Blazers & Deconstructed Cut",
    taglineSr: "Maksimalna fleksibilnost i prozračnost bez kompromisa u stilu.",
    taglineEn: "Maximum flexibility and breathability without compromising elegance.",
    image: "/img/odela2.jpg",
    href: "/web-shop?categoryGroup=sakoi",
  },
  {
    id: "look-3",
    seasonSr: "SARTORIAL HERITAGE",
    seasonEn: "SARTORIAL HERITAGE",
    titleSr: "Poslovna Elegancija & Uniforme",
    titleEn: "Corporate Elegance & Business Uniforms",
    taglineSr: "Kompletna garderoba za korporativne lidere i premium hotele.",
    taglineEn: "Complete wardrobe for corporate leaders and luxury hospitality.",
    image: "/img/hero2.jpg",
    href: "/poslovne-uniforme",
  },
];

export default function EditorialLookbook({ lang = "sr" }: { lang?: StorefrontLanguage }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const isEn = lang === "en";
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) => (isEn ? `${href}?lang=en` : href);

  const activeLook = LOOKS[currentIdx] || LOOKS[0];

  return (
    <section className="luxury-editorial-lookbook py-5 bg-black text-white position-relative overflow-hidden">
      <div className="container py-lg-4">
        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between mb-5 gap-3">
          <div>
            <span className="lux-eyebrow mb-1">
              <ShinyText text={tx("EDITORIAL CAMPAIGN • THE SARTORIAL LOOK", "EDITORIAL CAMPAIGN • THE SARTORIAL LOOK")} />
            </span>
            <BlurText
              text={tx("Pogled u Kolekciju 2026", "A Glimpse Into the 2026 Collection")}
              as="h2"
              className="section-title text-uppercase m-0 text-white"
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            {LOOKS.map((look, i) => (
              <button
                key={look.id}
                type="button"
                onClick={() => setCurrentIdx(i)}
                className={`btn btn-sm px-3 py-2 text-uppercase transition-all ${
                  currentIdx === i ? "btn-light fw-bold" : "btn-outline-secondary text-white-50"
                }`}
                style={{ fontSize: "0.76rem", letterSpacing: "0.14em" }}
              >
                0{i + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Big Editorial Spread */}
        <div className="row g-4 g-lg-5 align-items-stretch">
          {/* Main Visual */}
          <div className="col-12 col-lg-8">
            <div
              className="position-relative overflow-hidden rounded-1"
              style={{ aspectRatio: "16 / 10", minHeight: "440px", backgroundColor: "#111" }}
            >
              <Image
                src={activeLook.image}
                alt={isEn ? activeLook.titleEn : activeLook.titleSr}
                fill
                sizes="(max-width: 991px) 100vw, 66vw"
                style={{ objectFit: "cover", objectPosition: "center 25%" }}
                priority={false}
              />
              <div
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)",
                }}
              />
              <div className="position-absolute bottom-0 start-0 p-4 p-md-5">
                <span
                  className="badge bg-dark border border-secondary text-uppercase mb-2 px-3 py-1"
                  style={{ letterSpacing: "0.18em", fontSize: "0.7rem", color: "var(--lux-gold, #c9a96e)" }}
                >
                  {isEn ? activeLook.seasonEn : activeLook.seasonSr}
                </span>
                <h3 className="h1 font-display text-uppercase mb-2 text-white">
                  {isEn ? activeLook.titleEn : activeLook.titleSr}
                </h3>
                <p className="text-white-50 mb-3" style={{ maxWidth: "560px", fontSize: "1rem" }}>
                  {isEn ? activeLook.taglineEn : activeLook.taglineSr}
                </p>
                <Link
                  href={withLang(activeLook.href)}
                  className="btn btn-outline-light text-uppercase px-4 py-2"
                  style={{ letterSpacing: "0.14em", fontSize: "0.82rem" }}
                >
                  {tx("Istraži Izbor", "Discover Edit")} &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Secondary Thumbnail Rail */}
          <div className="col-12 col-lg-4 d-flex flex-column justify-content-between gap-3">
            {LOOKS.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setCurrentIdx(idx)}
                role="button"
                tabIndex={0}
                className={`p-3 p-md-4 rounded-1 border transition-all cursor-pointer ${
                  currentIdx === idx
                    ? "bg-dark border-warning shadow"
                    : "bg-black text-secondary border-dark opacity-75 hover-opacity-100"
                }`}
                style={{ flex: 1, outline: "none" }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="position-relative overflow-hidden rounded-1 flex-shrink-0"
                    style={{ width: "64px", height: "80px" }}
                  >
                    <Image
                      src={item.image}
                      alt={item.titleSr}
                      fill
                      sizes="80px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div>
                    <span
                      className="d-block text-uppercase fw-semibold mb-1"
                      style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "var(--lux-gold, #c9a96e)" }}
                    >
                      {isEn ? item.seasonEn : item.seasonSr}
                    </span>
                    <h4 className="h6 text-uppercase text-white mb-0 font-display">
                      {isEn ? item.titleEn : item.titleSr}
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
