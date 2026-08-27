import Link from "next/link";

/**
 * The hero's copy block.
 *
 * Markup only — HeroFx owns the animation. That split matters here more than
 * anywhere else on the page: this used to animate on mount, which meant that
 * on a first visit the whole entrance played *behind* the preloader curtain
 * and was over before the curtain lifted. The visitor paid for an intro they
 * never saw. HeroFx now holds the timeline paused and starts it against the
 * curtain lift instead.
 *
 * The hidden start states live in santos-motion.scss behind `.motion-ready`,
 * so with no JS the hero renders complete.
 */

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
}: Props) {
  return (
    <div className="ss-home18-hero__intro text-white" data-hero-intro>
      <p className="fw-semi-bold mb-0 ss-home18-hero__eyebrow text-uppercase" data-hero-eyebrow>
        {eyebrow}
      </p>
      <span className="ss-hero-gold-line" aria-hidden="true" data-hero-rule />
      {/* The home page had no h1 at all — the hero headline is its primary topic. */}
      <h1 className="hero-display fw-semi-bold lh-1 mb-5 text-white" data-hero-title>
        {titleLine1}
        <br />
        {titleLine2}
      </h1>
      <div className="d-flex align-items-center gap-3 flex-wrap ss-home18-hero__cta" data-hero-cta>
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
