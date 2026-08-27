"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ShinyText from "@/app/components/motion/ShinyText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

type Props = {
  heroImage?: string;
  heroVideo?: string;
  lang?: string;
};

export default function GsapHeroCinematic({
  heroImage = "/img/hero.jpg",
  heroVideo,
  lang = "sr",
}: Props) {
  const isEn = lang === "en";
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || !mediaRef.current || !textRef.current) return;

      // Pin and scrub zoom out
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=80%",
          scrub: 1.2,
          pin: true,
          anticipatePin: 1,
        },
      });

      tl.to(
        mediaRef.current,
        {
          scale: 1.08,
          filter: "brightness(0.7)",
          ease: "none",
        },
        0,
      )
        .to(
          overlayRef.current,
          {
            backgroundColor: "rgba(8, 7, 6, 0.75)",
            ease: "none",
          },
          0,
        )
        .to(
          textRef.current,
          {
            y: -60,
            opacity: 0.85,
            ease: "none",
          },
          0,
        );
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="position-relative w-100 overflow-hidden" style={{ minHeight: "100vh", backgroundColor: "#080706" }}>
      {/* Background Media */}
      <div
        ref={mediaRef}
        className="position-absolute inset-0 w-100 h-100"
        style={{ transformOrigin: "center center", willChange: "transform, filter" }}
      >
        {heroVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-100 h-100 object-fit-cover"
            poster={heroImage}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={heroImage}
            alt="Santos & Santorini Haute Sartoria"
            fill
            priority
            className="object-fit-cover"
            sizes="100vw"
          />
        )}
      </div>

      {/* Cinematic Tint Overlay */}
      <div
        ref={overlayRef}
        className="position-absolute inset-0 w-100 h-100 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(8,7,6,0.35) 0%, rgba(8,7,6,0.55) 60%, rgba(8,7,6,0.92) 100%)",
        }}
      />

      {/* Hero Content */}
      <div className="container position-relative h-100 d-flex align-items-center" style={{ minHeight: "100vh", zIndex: 5 }}>
        <div ref={textRef} className="col-12 col-lg-8 col-xl-7 pt-5">
          {/* Champagne Shimmer Badge */}
          <div className="mb-3">
            <span className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-black bg-opacity-75 border border-warning border-opacity-30 rounded-1">
              <ShinyText
                text="SANTOS & SANTORINI • KOLEKCIJA 2026"
                className="ss-lp-eyebrow m-0 text-warning"
                speed={3}
              />
            </span>
          </div>

          {/* Headline */}
          <h1 className="ss-lp-title ss-lp-title--dark ss-lp-hero__title mb-3">
            {isEn ? (
              <>Timeless Elegance & Bespoke Tailoring</>
            ) : (
              <>
                Nova kolekcija <br />
                <span style={{ color: "var(--lp-gold, #c9a96e)" }}>2026</span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="ss-lp-hero__subtitle mb-4 pb-2">
            {isEn
              ? "Handcrafted luxury menswear, Italian fabrics, and modern sartorial precision for the discerning gentleman."
              : "Vrhunski italijanski materijali, besprekoran kroj i vanvremenska elegancija za modernog muškarca. Posetite naše salone u Nišu i Kruševcu."}
          </p>

          {/* CTAs */}
          <div className="d-flex flex-wrap align-items-center gap-3">
            <Link
              href={isEn ? "/web-shop?lang=en" : "/web-shop"}
              className="ss-lp-btn-primary"
            >
              {isEn ? "Explore Collection →" : "Istraži Kolekciju →"}
            </Link>
            <Link
              href={isEn ? "/custom-suits?lang=en" : "/custom-suits"}
              className="ss-lp-btn-outline"
            >
              {isEn ? "Made to Measure" : "Šivenje po Meri"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
