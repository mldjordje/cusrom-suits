"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";

type Props = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

const ease = [0.22, 1, 0.36, 1] as const;

const prefetchIfWebShop = (href: string) => href.includes("/web-shop");

export default function HomeHeroIntroMotion({
  eyebrow,
  titleLine1,
  titleLine2,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: Props) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className="ss-home18-hero__intro text-white" data-hero-intro>
        <p className="fw-semi-bold mb-0 ss-home18-hero__eyebrow text-uppercase">{eyebrow}</p>
        <span className="ss-hero-gold-line" aria-hidden="true" />
        <h2 className="hero-display fw-semi-bold lh-1 mb-5 text-white">
          {titleLine1}
          <br />
          {titleLine2}
        </h2>
        <div className="d-flex align-items-center gap-3 flex-wrap ss-home18-hero__cta">
          <Link
            href={primaryHref}
            prefetch={prefetchIfWebShop(primaryHref)}
            className="btn border-0 fw-semi-bold text-uppercase px-5 ss-cta-btn"
          >
            {primaryLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <m.div
      className="ss-home18-hero__intro text-white"
      data-hero-intro
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
      }}
    >
      <m.p
        className="fw-semi-bold mb-0 ss-home18-hero__eyebrow text-uppercase"
        variants={{
          hidden: { opacity: 0, y: 12 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
        }}
      >
        {eyebrow}
      </m.p>

      {/* Zlatna dekorativna linija */}
      <m.span
        className="ss-hero-gold-line"
        aria-hidden="true"
        variants={{
          hidden: { scaleX: 0, opacity: 0 },
          visible: { scaleX: 1, opacity: 1, transition: { duration: 0.7, ease, delay: 0.05 } },
        }}
        style={{ transformOrigin: "left" }}
      />

      <m.h2
        className="hero-display fw-semi-bold lh-1 mb-5 text-white"
        variants={{
          hidden: { opacity: 0, y: 36 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.88, ease } },
        }}
      >
        {titleLine1}
        <br />
        {titleLine2}
      </m.h2>

      <m.div
        className="d-flex align-items-center gap-3 flex-wrap ss-home18-hero__cta"
        variants={{
          hidden: { opacity: 0, y: 18 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
        }}
      >
        <m.span
          className="d-inline-flex"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.22 }}
        >
          <Link
            href={primaryHref}
            prefetch={prefetchIfWebShop(primaryHref)}
            className="btn border-0 fw-semi-bold text-uppercase px-5 ss-cta-btn"
          >
            {primaryLabel}
          </Link>
        </m.span>
      </m.div>
    </m.div>
  );
}
