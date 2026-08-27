"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const STEPS = [
  {
    step: "01",
    tag: "TKANINA & TEKSTURA",
    title: "Vitale Barberis & Loro Piana",
    desc: "Preko 200 prestižnih italijanskih vunenih štofova Super 130s do Super 150s. Prirodan pad i prozračnost za celogodišnju eleganciju.",
    badge: "100% Italijanska Vuna",
  },
  {
    step: "02",
    tag: "KONSTRUKCIJA RAMENA",
    title: "Autentična Spalla Camicia",
    desc: "Napuljsko 'košuljasto' meko rame bez teških sintetičkih jastučića. Omogućava potpunu slobodu pokreta i moderan, opušten luksuz.",
    badge: "Ručno Ukrojeno Rame",
  },
  {
    step: "03",
    tag: "ZAVRŠNI DETALJI",
    title: "Ručni AMF Štep & Prirodan Rog",
    desc: "Fini milimetarski štep duž revera i džepova, funkcionalni otvori za dugmad na rukavima i dugmad od pravog bivoljeg roga.",
    badge: "Artisanal Tailoring",
  },
];

type Props = {
  lang?: string;
};

export default function GsapBespokeScrubStage({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const sectionRef = useRef<HTMLDivElement>(null);
  const garmentRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useGSAP(
    () => {
      if (!sectionRef.current || !garmentRef.current) return;

      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "+=200%",
        pin: true,
        scrub: 0.8,
        onUpdate: (self) => {
          const progress = self.progress;
          const nextIndex = Math.min(
            STEPS.length - 1,
            Math.floor(progress * STEPS.length),
          );
          setActiveStep(nextIndex);

          // Subtle camera pan/zoom based on scroll
          if (garmentRef.current) {
            const scale = 1 + progress * 0.15;
            const yMove = -progress * 40;
            gsap.set(garmentRef.current, {
              scale,
              y: yMove,
              ease: "none",
            });
          }
        },
      });
    },
    { scope: sectionRef },
  );

  const current = STEPS[activeStep];

  return (
    <section
      ref={sectionRef}
      className="position-relative overflow-hidden"
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0908",
        color: "#f2eee7",
      }}
    >
      <div className="container h-100 d-flex flex-column justify-content-center" style={{ minHeight: "100vh" }}>
        {/* Eyebrow / Progress */}
        <div className="d-flex align-items-center justify-content-between border-bottom border-dark pb-3 mb-4">
          <div>
            <span className="ss-lp-eyebrow mb-1">
              {isEn ? "BESPOKE SARTORIA EXPERIENCE" : "KROJAČKA MAJSTORIJA • ŠIVENJE PO MERI"}
            </span>
            <h2 className="ss-lp-title ss-lp-title--dark fs-2 m-0">
              {isEn ? "Anatomy of Perfection" : "Anatomija Savršenog Odela"}
            </h2>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark fw-bold px-3 py-1">
              Faza {current.step} / 03
            </span>
          </div>
        </div>

        {/* 2-Column Stage */}
        <div className="row g-4 g-lg-5 align-items-center">
          {/* Left: Dynamic Suit Mannequin / Image */}
          <div className="col-12 col-lg-6">
            <div
              className="position-relative rounded-2 overflow-hidden border border-secondary border-opacity-25"
              style={{
                aspectRatio: "4/5",
                maxHeight: "65vh",
                backgroundColor: "#121110",
              }}
            >
              <div
                ref={garmentRef}
                className="position-absolute inset-0 w-100 h-100"
                style={{ willChange: "transform" }}
              >
                <Image
                  src="/img/hero.jpg"
                  alt="Santos & Santorini Bespoke Suit"
                  fill
                  className="object-fit-cover"
                  sizes="(max-width: 991px) 90vw, 45vw"
                />
              </div>

              {/* Dynamic Hotspot Floating Badge */}
              <div
                className="position-absolute bottom-0 start-0 end-0 p-4"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(10,9,8,0.9) 60%, #0a0908 100%)",
                }}
              >
                <span className="badge bg-warning text-dark fw-bold mb-1">
                  ✦ {current.badge}
                </span>
                <div className="text-white-50 small">
                  Skrolujte za analizu svakog krojačkog detalja.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Step Text with Progress Lines */}
          <div className="col-12 col-lg-6">
            <div className="ps-lg-4">
              <span className="ss-lp-eyebrow mb-2">{current.tag}</span>
              <h3 className="ss-lp-title ss-lp-title--dark fs-1 mb-3 text-white">
                {current.title}
              </h3>
              <p
                className="text-white-50 mb-4"
                style={{ fontSize: "1.05rem", lineHeight: 1.6 }}
              >
                {current.desc}
              </p>

              {/* Progress Step Indicators */}
              <div className="d-flex gap-2 mb-4 pb-2">
                {STEPS.map((s, idx) => (
                  <div
                    key={s.step}
                    style={{
                      height: "3px",
                      flex: 1,
                      backgroundColor:
                        idx <= activeStep ? "var(--lp-gold, #c9a96e)" : "rgba(255,255,255,0.15)",
                      transition: "background-color 0.4s ease",
                    }}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="d-flex flex-wrap align-items-center gap-3">
                <Link href="/custom-suits" className="ss-lp-btn-primary">
                  Otvori 3D Konfigurator &rarr;
                </Link>
                <Link href="/kontakt" className="ss-lp-btn-outline">
                  Zakaži Fiting u Salonu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
