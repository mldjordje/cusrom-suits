"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

type Props = {
  lang?: string;
};

export default function GsapHeritageCounter({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const sectionRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!metricsRef.current) return;
      const cards = metricsRef.current.querySelectorAll(".ss-lp-metric-card");

      gsap.from(cards, {
        y: 50,
        opacity: 0,
        stagger: 0.15,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: metricsRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="ss-lp-heritage-section">
      <div className="container">
        {/* Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-end justify-content-between mb-5 pb-3 border-bottom border-dark">
          <div>
            <span className="ss-lp-eyebrow mb-2">
              {isEn ? "SARTORIA & ATELIER NIŠ • EST. 2007" : "SARTORIA & ATELJE NIŠ • OD 2007"}
            </span>
            <h2 className="ss-lp-title ss-lp-title--dark fs-1 m-0">
              {isEn ? "19 Years of Sartorial Mastery" : "19 Godina Tradicije i Elegancije"}
            </h2>
            <p className="text-white-50 small mt-2 mb-0" style={{ maxWidth: "580px" }}>
              {isEn
                ? "Every Santos & Santorini garment is shaped by master craftsmen combining Italian traditions with modern silhouettes."
                : "Svako Santos & Santorini odelo nastaje u rukama iskusnih majstora krojača. Spajamo tradiciju italijanskog krojenja sa modernim stilom."}
            </p>
          </div>
          <Link href="/o-nama" className="ss-lp-btn-outline mt-3 mt-md-0">
            {isEn ? "Discover Our Atelier →" : "Upoznajte Naš Atelier →"}
          </Link>
        </div>

        {/* 4 Craft Metrics */}
        <div ref={metricsRef} className="row g-3 g-md-4 mb-5">
          <div className="col-6 col-md-3">
            <div className="ss-lp-metric-card">
              <div className="ss-lp-metric-number">2007</div>
              <div className="ss-lp-metric-label">
                {isEn ? "Year Founded" : "Godina Osnivanja"}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="ss-lp-metric-card">
              <div className="ss-lp-metric-number">100%</div>
              <div className="ss-lp-metric-label">
                {isEn ? "Handmade & Fitting" : "Ručna Izrada & Fiting"}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="ss-lp-metric-card">
              <div className="ss-lp-metric-number">200+</div>
              <div className="ss-lp-metric-label">
                {isEn ? "Italian Fabrics" : "Italijanskih Tkanina"}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="ss-lp-metric-card">
              <div className="ss-lp-metric-number">5.000+</div>
              <div className="ss-lp-metric-label">
                {isEn ? "Satisfied Clients" : "Zadovoljnih Klijenata"}
              </div>
            </div>
          </div>
        </div>

        {/* Showrooms Cards (Niš & Kruševac) */}
        <div className="row g-4">
          <div className="col-12 col-md-6">
            <div className="ss-lp-showroom-card">
              <div>
                <span className="ss-lp-eyebrow mb-2">GLAVNI ATELIER & SALON</span>
                <h3 className="ss-lp-title ss-lp-title--dark fs-3 mb-2 text-white">
                  Niš • Obrenovićeva 9
                </h3>
                <p className="text-white-50 small mb-4">
                  Showroom i krojački atelier u srcu Niša. Kompletan asortiman gotovih odela, sakoa, tkanina za šivenje po meri i besplatne konsultacije sa stilistima.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <a
                  href="tel:+381694455106"
                  className="btn btn-outline-light btn-sm px-3 py-2 rounded-1"
                >
                  📞 +381 69 445 5106
                </a>
                <Link
                  href="/kontakt"
                  className="btn btn-warning btn-sm px-3 py-2 rounded-1 fw-semibold text-dark"
                >
                  Zakaži Posetu
                </Link>
              </div>
            </div>
          </div>

          <div className="col-12 col-md-6">
            <div className="ss-lp-showroom-card">
              <div>
                <span className="ss-lp-eyebrow mb-2">PREMIJUM SHOWROOM</span>
                <h3 className="ss-lp-title ss-lp-title--dark fs-3 mb-2 text-white">
                  Kruševac • Centar
                </h3>
                <p className="text-white-50 small mb-4">
                  Ekskluzivni izložbeni salon sa odabranim modelima aktuelne kolekcije, muškim odelima, poslovnim uniformama i aksesoarima.
                </p>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link
                  href="/kontakt"
                  className="btn btn-outline-light btn-sm px-3 py-2 rounded-1"
                >
                  Informacije
                </Link>
                <Link
                  href="/kontakt"
                  className="btn btn-light btn-sm px-3 py-2 rounded-1 fw-semibold"
                >
                  Sve Lokacije &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
