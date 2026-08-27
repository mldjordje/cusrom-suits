import Link from "next/link";
import ShinyText from "@/app/components/motion/ShinyText";

type Props = {
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

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
  return (
    <div className="ss-home18-hero__intro text-white position-relative" data-hero-intro>
      {/* Eyebrow with gold shimmering shimmer */}
      <div className="d-flex align-items-center gap-3 mb-2" data-hero-eyebrow>
        <span className="badge bg-black border border-warning border-opacity-25 px-3 py-1 text-uppercase fw-semibold" style={{ letterSpacing: "0.22em", fontSize: "0.72rem" }}>
          <ShinyText text={eyebrow || "SANTOS & SANTORINI"} />
        </span>
        <span className="text-white-50 text-uppercase d-none d-md-inline-block" style={{ letterSpacing: "0.18em", fontSize: "0.72rem" }}>
          COLLECTION 2026
        </span>
      </div>

      <span className="ss-hero-gold-line" aria-hidden="true" data-hero-rule />

      <h1 className="hero-display fw-semi-bold lh-1 mb-4 text-white font-display" data-hero-title style={{ textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}>
        {titleLine1}
        {titleLine2 ? (
          <>
            <br />
            <span style={{ color: "var(--lux-gold-bright, #f3dc9e)" }}>{titleLine2}</span>
          </>
        ) : null}
      </h1>

      <p className="lux-hero-subtitle text-white mb-5" style={{ maxWidth: "540px", fontSize: "1.12rem", lineHeight: 1.6, textShadow: "0 2px 16px rgba(0,0,0,0.9)", color: "#e6e0d5" }}>
        Vrhunski italijanski materijali, besprekoran kroj i vanvremenska elegancija za modernog muškarca.
      </p>

      <div className="d-flex align-items-center gap-3 flex-wrap ss-home18-hero__cta" data-hero-cta>
        <Link
          href={primaryHref}
          prefetch={prefetchIfWebShop(primaryHref)}
          className="btn border-0 fw-semi-bold text-uppercase px-4 px-md-5 py-3 ss-cta-btn ss-cta-btn--primary"
        >
          {primaryLabel} &rarr;
        </Link>
        {secondaryLabel && secondaryHref ? (
          <Link
            href={secondaryHref}
            prefetch={prefetchIfWebShop(secondaryHref)}
            className="btn fw-semi-bold text-uppercase px-4 px-md-5 py-3 ss-cta-btn ss-cta-btn--secondary"
          >
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
