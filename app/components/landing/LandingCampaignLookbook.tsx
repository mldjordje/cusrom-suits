"use client";

import { useState } from "react";
import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

const CAMPAIGNS = [
  {
    id: "01",
    label: "KAMPANJA 2026",
    title: "Italijanska Vuna & Dvoredni Kroj",
    subtitle: "Besprijekorna silueta sa špicastim reverima i ručno šivenim detaljima.",
    image: "/img/hero.jpg",
    ctaText: "Istraži Izbor →",
    ctaHref: "/web-shop?categoryGroup=odela",
  },
  {
    id: "02",
    label: "ELEGANT TRAVEL",
    title: "Moderni Sakoi & Lagana Struktura",
    subtitle: "Prirodna fleksibilnost i komfor za putovanja i celodnevne sastanke.",
    image: "/img/hero.jpg",
    ctaText: "Pogledaj Sakoe →",
    ctaHref: "/web-shop?categoryGroup=odela",
  },
  {
    id: "03",
    label: "SARTORIAL HERITAGE",
    title: "Poslovna Elegancija & Uniforme",
    subtitle: "Prestižni standard odevanja za rukovodioce i premijum kompanije.",
    image: "/img/hero.jpg",
    ctaText: "Poslovne Uniforme →",
    ctaHref: "/poslovne-uniforme",
  },
];

type Props = {
  lang?: string;
};

export default function LandingCampaignLookbook({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const [activeIdx, setActiveIdx] = useState(0);
  const current = CAMPAIGNS[activeIdx];

  return (
    <section className="ss-lp-lookbook-section">
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-4 pb-2 border-bottom border-dark">
          <div>
            <span className="ss-lp-eyebrow mb-2">
              {isEn ? "EDITORIAL CAMPAIGN" : "MODNI EDITORIJAL • LOOKBOOK"}
            </span>
            <h2 className="ss-lp-title ss-lp-title--dark fs-1 m-0">
              {isEn ? "The Sartorial Look 2026" : "Pogled u Kolekciju 2026"}
            </h2>
          </div>

          {/* Tab buttons */}
          <div className="d-flex gap-2 mt-3 mt-md-0">
            {CAMPAIGNS.map((camp, idx) => (
              <button
                key={camp.id}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`btn btn-sm ${
                  activeIdx === idx
                    ? "btn-light text-dark fw-bold"
                    : "btn-outline-secondary text-white-50"
                }`}
                style={{ minWidth: "44px", borderRadius: "2px" }}
              >
                {camp.id}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Stage */}
        <div className="row g-4 align-items-center">
          {/* Main Large Stage */}
          <div className="col-12 col-lg-8">
            <div className="ss-lp-lookbook-stage position-relative">
              <StorefrontImage
                sources={[current.image]}
                fallbackSrc="/img/hero.jpg"
                fill
                alt={current.title}
                className="object-fit-cover"
              />
              <div
                className="position-absolute bottom-0 start-0 end-0 p-4 p-md-5"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(8,7,6,0.85) 60%, #080706 100%)",
                }}
              >
                <span className="ss-lp-eyebrow mb-2">{current.label}</span>
                <h3 className="ss-lp-title ss-lp-title--dark fs-2 mb-2 text-white">
                  {current.title}
                </h3>
                <p className="text-white-50 small mb-3" style={{ maxWidth: "480px" }}>
                  {current.subtitle}
                </p>
                <Link
                  href={current.ctaHref}
                  className="ss-lp-btn-primary"
                >
                  {current.ctaText}
                </Link>
              </div>
            </div>
          </div>

          {/* Right Thumbnails / Stories */}
          <div className="col-12 col-lg-4">
            <div className="d-flex flex-column gap-3">
              {CAMPAIGNS.map((camp, idx) => (
                <div
                  key={camp.id}
                  onClick={() => setActiveIdx(idx)}
                  className={`ss-lp-lookbook-tab ${activeIdx === idx ? "active" : ""}`}
                >
                  <div
                    className="position-relative flex-shrink-0 rounded-1 overflow-hidden"
                    style={{ width: "65px", height: "65px" }}
                  >
                    <StorefrontImage
                      sources={[camp.image]}
                      fallbackSrc="/img/hero.jpg"
                      fill
                      alt={camp.title}
                      className="object-fit-cover"
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="ss-lp-eyebrow" style={{ fontSize: "0.65rem" }}>
                      {camp.label}
                    </div>
                    <div className="fw-semibold text-white small">
                      {camp.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
