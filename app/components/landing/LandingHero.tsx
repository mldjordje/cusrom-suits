"use client";

import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import ShinyText from "@/app/components/motion/ShinyText";
import BlurText from "@/app/components/motion/BlurText";

type Props = {
  heroImage?: string;
  heroVideo?: string;
  lang?: string;
};

export default function LandingHero({
  heroImage = "/img/hero.jpg",
  heroVideo,
  lang = "sr",
}: Props) {
  const isEn = lang === "en";
  const withLang = (path: string) => (isEn ? `${path}?lang=en` : path);

  return (
    <>
      <section className="ss-lp-hero position-relative">
        {/* Background media */}
        <div className="ss-lp-hero__bg">
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
            <StorefrontImage
              sources={[heroImage]}
              fallbackSrc="/img/hero.jpg"
              fill
              priority
              alt="Santos & Santorini Sartoria 2026"
              className="object-fit-cover"
            />
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="ss-lp-hero__overlay" aria-hidden="true" />

        {/* Content */}
        <div className="container position-relative">
          <div className="ss-lp-hero__content col-12 col-lg-8 col-xl-7">
            {/* Shimmering Badge */}
            <div className="mb-3">
              <span className="d-inline-flex align-items-center gap-2 px-3 py-1 bg-black bg-opacity-75 border border-warning border-opacity-25 rounded-1">
                <ShinyText
                  text="SANTOS & SANTORINI • KOLEKCIJA 2026"
                  className="ss-lp-eyebrow m-0 text-warning"
                  speed={3.5}
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

            {/* Action Buttons */}
            <div className="d-flex flex-wrap align-items-center gap-3">
              <Link
                href={withLang("/web-shop")}
                className="ss-lp-btn-primary"
              >
                {isEn ? "Explore Collection →" : "Istraži Kolekciju →"}
              </Link>
              <Link
                href={withLang("/custom-suits")}
                className="ss-lp-btn-outline"
              >
                {isEn ? "Made to Measure" : "Šivenje po Meri"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Runway Marquee Ribbon */}
      <div className="ss-lp-marquee" aria-hidden="true">
        <div className="ss-lp-marquee__track">
          {[1, 2, 3, 4].map((idx) => (
            <span key={idx} className="d-inline-flex align-items-center gap-4">
              <span className="ss-lp-marquee__item">ITALIAN WOOL & CASHMERE</span>
              <span className="ss-lp-marquee__dot">✦</span>
              <span className="ss-lp-marquee__item">BESPOKE TAILORING</span>
              <span className="ss-lp-marquee__dot">✦</span>
              <span className="ss-lp-marquee__item">ATELIER NIŠ & KRUŠEVAC</span>
              <span className="ss-lp-marquee__dot">✦</span>
              <span className="ss-lp-marquee__item">HANDMADE CRAFTSMANSHIP</span>
              <span className="ss-lp-marquee__dot">✦</span>
              <span className="ss-lp-marquee__item">VANVREMENSKA ELEGANCIJA</span>
              <span className="ss-lp-marquee__dot">✦</span>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
