"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const LOOKBOOK_SCENES = [
  {
    id: "01",
    label: "KAMPANJA 2026 • SARTORIAL LOOK",
    title: "Italijanska Vuna & Dvoredni Kroj",
    subtitle: "Besprijekorna silueta sa špicastim reverima i ručno šivenim detaljima od najfinije Biella vune.",
    image: "/img/hero.jpg",
    ctaText: "Istraži Odela →",
    ctaHref: "/web-shop?categoryGroup=odela",
  },
  {
    id: "02",
    label: "ELEGANT TRAVEL • PROLEĆE 2026",
    title: "Moderni Sakoi & Lagana Struktura",
    subtitle: "Prirodna fleksibilnost i nenadmašan komfor bez teških postava za gospodu u pokretu.",
    image: "/img/hero.jpg",
    ctaText: "Pogledaj Sakoe →",
    ctaHref: "/web-shop?categoryGroup=odela",
  },
  {
    id: "03",
    label: "ATELIER BESPOKE • PRIVÉ",
    title: "Poslovna Elegancija & Ceremonijalna Odela",
    subtitle: "Prestižni standard odevanja skrojen po vašim merama u našem salonu u Nišu.",
    image: "/img/hero.jpg",
    ctaText: "Šivenje po Meri →",
    ctaHref: "/custom-suits",
  },
];

type Props = {
  lang?: string;
};

export default function GsapHorizontalLookbook({ lang = "sr" }: Props) {
  const isEn = lang === "en";
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !trackRef.current) return;

      const track = trackRef.current;
      const totalWidth = track.scrollWidth - window.innerWidth;

      if (totalWidth <= 0) return;

      gsap.to(track, {
        x: -totalWidth,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: () => `+=${totalWidth * 1.2}`,
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="position-relative overflow-hidden bg-black text-white"
      style={{ minHeight: "100vh" }}
    >
      {/* Top Section Header */}
      <div className="container position-absolute top-0 start-50 translate-middle-x pt-5 pb-3" style={{ zIndex: 10 }}>
        <div className="d-flex align-items-center justify-content-between border-bottom border-dark pb-2">
          <div>
            <span className="ss-lp-eyebrow mb-1">
              {isEn ? "AWWWARDS EDITORIAL LOOKBOOK" : "MODNI EDITORIJAL • SCROLL HORIZONT"}
            </span>
            <h2 className="ss-lp-title ss-lp-title--dark fs-2 m-0 text-white">
              {isEn ? "The Sartorial Journey 2026" : "Kolekcija kroz Objektiv"}
            </h2>
          </div>
          <span className="text-white-50 small d-none d-md-block">
            {isEn ? "Scroll to navigate horizontal spreads ➔" : "Skrolujte za horizontalni modni editorijal ➔"}
          </span>
        </div>
      </div>

      {/* Horizontal Track */}
      <div
        ref={trackRef}
        className="d-flex align-items-center h-100 position-relative"
        style={{
          width: "max-content",
          height: "100vh",
          paddingLeft: "clamp(2rem, 5vw, 6rem)",
          paddingRight: "clamp(2rem, 5vw, 6rem)",
          gap: "clamp(2rem, 4vw, 5rem)",
          willChange: "transform",
        }}
      >
        {LOOKBOOK_SCENES.map((scene) => (
          <div
            key={scene.id}
            className="position-relative flex-shrink-0 rounded-2 overflow-hidden border border-secondary border-opacity-25"
            style={{
              width: "clamp(320px, 60vw, 840px)",
              height: "clamp(420px, 68vh, 620px)",
              backgroundColor: "#121110",
            }}
          >
            {/* Image */}
            <Image
              src={scene.image}
              alt={scene.title}
              fill
              className="object-fit-cover"
              sizes="(max-width: 768px) 90vw, 60vw"
            />

            {/* Gradient Overlay & Text */}
            <div
              className="position-absolute inset-0 d-flex flex-column justify-content-end p-4 p-md-5"
              style={{
                background: "linear-gradient(180deg, transparent 40%, rgba(8,7,6,0.88) 75%, #080706 100%)",
              }}
            >
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="badge bg-warning text-dark fw-bold px-2 py-1" style={{ fontSize: "0.7rem" }}>
                  {scene.id}
                </span>
                <span className="ss-lp-eyebrow m-0 text-warning">{scene.label}</span>
              </div>
              <h3 className="ss-lp-title ss-lp-title--dark fs-2 mb-2 text-white">
                {scene.title}
              </h3>
              <p className="text-white-50 small mb-4" style={{ maxWidth: "520px" }}>
                {scene.subtitle}
              </p>
              <div>
                <Link
                  href={isEn ? `${scene.ctaHref}?lang=en` : scene.ctaHref}
                  className="ss-lp-btn-primary"
                >
                  {scene.ctaText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
