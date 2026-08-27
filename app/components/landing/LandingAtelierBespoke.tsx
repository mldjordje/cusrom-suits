"use client";

import { useState } from "react";
import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

const FABRICS = [
  {
    id: "vbc-navy",
    name: "Vitale Barberis Canonico",
    spec: "Super 130s Pure Wool (Biella, Italy)",
    colorDot: "#1a2a3a",
    image: "/img/hero.jpg",
    accent: "Idealno za celogodišnja poslovna i svečana odela sa prirodnim padom i prozračnošću.",
  },
  {
    id: "reda-charcoal",
    name: "Reda 1865 Sharkskin",
    spec: "Super 150s Wool (Valdilana, Italy)",
    colorDot: "#303030",
    image: "/img/hero.jpg",
    accent: "Luksuzna tekstura sa suptilnim mikro-dezenom otporna na gužvanje tokom putovanja.",
  },
  {
    id: "cerruti-midnight",
    name: "Lanificio F.lli Cerruti",
    spec: "Midnight Satin Super 130s",
    colorDot: "#0f172a",
    image: "/img/hero.jpg",
    accent: "Duboka ponoćno plava sa svilenkastim reverima za ekskluzivne smokinge i gala večeri.",
  },
  {
    id: "loro-camel",
    name: "Loro Piana Zelander",
    spec: "Merino & Cashmere Blend",
    colorDot: "#9c7a56",
    image: "/img/hero.jpg",
    accent: "Izuzetna mekoća i toplotna izolacija za kapute i struktuirane zimske sakoe.",
  },
];

type Props = {
  lang?: string;
};

export default function LandingAtelierBespoke({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const [selectedFabric, setSelectedFabric] = useState(FABRICS[0]);

  return (
    <section className="ss-lp-atelier-section">
      <div className="container">
        {/* Section Header */}
        <div className="text-center max-w-700 mx-auto mb-5">
          <span className="ss-lp-eyebrow mb-2">
            {isEn ? "SARTORIAL ATELIER • MADE TO MEASURE" : "KROJAČKI ATELJE • ŠIVENJE PO MERI"}
          </span>
          <h2 className="ss-lp-title ss-lp-title--dark fs-1 mb-3">
            {isEn ? "Mastery in Every Single Stitch" : "Umetnost Savršenog Kroja"}
          </h2>
          <p className="text-muted small mx-auto" style={{ maxWidth: "620px" }}>
            {isEn
              ? "From the initial measurement to the final hand-stitched buttonhole, our master tailors create garments customized to your exact posture and silhouette."
              : "Od prvog uzimanja mera do ručno prošivenog revera — spajamo viševekovnu tradiciju italijanskog krojenja sa modernom siluetom za vaš jedinstveni stav."}
          </p>
        </div>

        {/* 2-Column Experience Stage */}
        <div className="row g-4 g-lg-5 align-items-center">
          {/* Garment Showcase with Hotspots */}
          <div className="col-12 col-lg-6">
            <div className="position-relative rounded-2 overflow-hidden border border-secondary border-opacity-25" style={{ aspectRatio: "4/5" }}>
              <StorefrontImage
                sources={[selectedFabric.image]}
                fallbackSrc="/img/hero.jpg"
                fill
                alt="Santos Bespoke Suit"
                className="object-fit-cover"
              />

              {/* Dynamic Fabric Info Overlay */}
              <div
                className="position-absolute bottom-0 start-0 end-0 p-4"
                style={{
                  background: "linear-gradient(180deg, transparent 0%, rgba(8,7,6,0.92) 50%, #080706 100%)",
                }}
              >
                <span className="ss-lp-eyebrow mb-1">
                  ODABRANA TKANINA:
                </span>
                <h4 className="text-white m-0 fs-5 fw-semibold mb-1">
                  {selectedFabric.name}
                </h4>
                <div className="small mb-2" style={{ color: "var(--lp-gold)" }}>
                  {selectedFabric.spec}
                </div>
                <p className="small text-white-50 m-0">
                  {selectedFabric.accent}
                </p>
              </div>
            </div>
          </div>

          {/* Controls & Fabric Selection */}
          <div className="col-12 col-lg-6">
            <div className="ps-lg-3">
              <span className="ss-lp-eyebrow mb-2">
                1. IZBOR VRHUNSKIH TKANINA
              </span>
              <h3 className="ss-lp-title ss-lp-title--dark fs-3 mb-3">
                Preko 200 Italijanskih Tkanina
              </h3>
              <p className="text-white-50 small mb-4">
                Sarađujemo direktno sa najprestižnijim italijanskim manufakturama. Izaberite tkaninu za simulaciju strukture:
              </p>

              {/* Fabric Picker Buttons */}
              <div className="d-flex flex-column gap-2 mb-4">
                {FABRICS.map((fabric) => (
                  <button
                    key={fabric.id}
                    type="button"
                    onClick={() => setSelectedFabric(fabric)}
                    className={`ss-lp-fabric-btn text-start ${
                      selectedFabric.id === fabric.id ? "active" : ""
                    }`}
                  >
                    <span
                      className="ss-lp-fabric-dot flex-shrink-0"
                      style={{ backgroundColor: fabric.colorDot }}
                    />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">{fabric.name}</div>
                      <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                        {fabric.spec}
                      </div>
                    </div>
                    {selectedFabric.id === fabric.id && (
                      <span className="text-warning small">✓</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Bespoke Craft Highlights */}
              <div className="row g-3 mb-4 pb-2">
                <div className="col-6">
                  <div className="p-3 bg-black bg-opacity-50 border border-secondary border-opacity-25 rounded-1">
                    <div className="fw-bold small text-warning mb-1">✦ Spalla Camicia</div>
                    <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
                      Autentično napuljsko meko rame bez teških jastučića.
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 bg-black bg-opacity-50 border border-secondary border-opacity-25 rounded-1">
                    <div className="fw-bold small text-warning mb-1">✦ AMF Ručni Štep</div>
                    <div className="text-white-50" style={{ fontSize: "0.75rem" }}>
                      Precizan milimetarski štep na reverima i džepovima.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap align-items-center gap-3">
                <Link
                  href="/custom-suits"
                  className="ss-lp-btn-primary"
                >
                  Otvori 3D Konfigurator &rarr;
                </Link>
                <Link
                  href="/kontakt"
                  className="ss-lp-btn-outline"
                >
                  Zakaži Fiting u Nišu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
