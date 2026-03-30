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
      <div className="ss-home18-hero__intro text-center text-white" data-hero-intro>
        <p className="text-uppercase fs-13 fw-normal mb-2 text-white ss-home18-hero__eyebrow">{eyebrow}</p>
        <h2 className="text-uppercase h1 fw-semi-bold lh-1 mb-4 text-white">
          {titleLine1}
          <br />
          {titleLine2}
        </h2>
        <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap ss-home18-hero__cta">
          <Link
            href={primaryHref}
            prefetch={prefetchIfWebShop(primaryHref)}
            className="btn btn-light border-0 fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            prefetch={prefetchIfWebShop(secondaryHref)}
            className="btn btn-outline-light fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn ss-cta-btn--ghost-light"
          >
            {secondaryLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <m.div
      className="ss-home18-hero__intro text-center text-white"
      data-hero-intro
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.11, delayChildren: 0.06 } },
      }}
    >
      <m.p
        className="text-uppercase fs-13 fw-normal mb-2 text-white ss-home18-hero__eyebrow"
        variants={{
          hidden: { opacity: 0, y: 16 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.68, ease } },
        }}
      >
        {eyebrow}
      </m.p>
      <m.h2
        className="text-uppercase h1 fw-semi-bold lh-1 mb-4 text-white"
        variants={{
          hidden: { opacity: 0, y: 32 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.82, ease } },
        }}
      >
        {titleLine1}
        <br />
        {titleLine2}
      </m.h2>
      <m.div
        className="d-flex align-items-center justify-content-center gap-2 flex-wrap ss-home18-hero__cta"
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.64, ease } },
        }}
      >
        <m.span className="d-inline-flex" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
          <Link
            href={primaryHref}
            prefetch={prefetchIfWebShop(primaryHref)}
            className="btn btn-light border-0 fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn"
          >
            {primaryLabel}
          </Link>
        </m.span>
        <m.span className="d-inline-flex" whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.2 }}>
          <Link
            href={secondaryHref}
            prefetch={prefetchIfWebShop(secondaryHref)}
            className="btn btn-outline-light fs-13 fw-semi-bold text-uppercase px-4 ss-cta-btn ss-cta-btn--ghost-light"
          >
            {secondaryLabel}
          </Link>
        </m.span>
      </m.div>
    </m.div>
  );
}
