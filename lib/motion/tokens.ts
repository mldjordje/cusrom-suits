/**
 * The one place easing, duration and travel distance are decided.
 *
 * Before this file the same `cubic-bezier(0.22, 1, 0.36, 1)` and the same
 * 0.5–0.6s were hand-typed into four separate components, which is why every
 * element on the landing page arrived with the identical gesture — the hero
 * headline and a price label were animated the same way. Motion carries
 * hierarchy only if the values differ on purpose, so they live here and are
 * imported, never retyped.
 *
 * Mirrors the CSS side in santos-lux.scss (`--lux-ease`, `--lux-dur*`); if one
 * changes, change the other.
 */

/** Three curves, and no fourth. */
export const EASE = {
  /** Entrances. Long tail, arrives rather than stops. */
  out: "expo.out",
  /** Symmetric — for anything that leaves and comes back. */
  io: "power3.inOut",
  /** Pointer state. Short enough that it reads as response, not animation. */
  state: "power2.out",
  /**
   * The only spring on the site, reserved for the discount badge: it is a
   * value cue, not decoration. Do not spend it anywhere else.
   */
  value: "back.out(1.6)",
} as const;

/** Duration scales with importance, same as distance does. */
export const DUR = {
  hero: 1.2,
  display: 1,
  section: 0.8,
  body: 0.6,
  state: 0.28,
} as const;

/**
 * Travel distance in px. `Reveal` used to clamp everything to 14px, which is
 * below the threshold where a move reads as intent rather than as a glitch.
 */
export const DIST = {
  /** prices, badges, meta rows, list items */
  s: 24,
  /** product cards, journal rows, contact block */
  m: 48,
  /** section headings, editorial blocks, hero */
  l: 96,
} as const;

export const STAGGER = {
  tight: 0.06,
  normal: 0.09,
  loose: 0.12,
} as const;

/**
 * One second of catch-up. The old values (0.7 / 0.8 / 0.9, three different
 * ones across two files) read as three different pages.
 */
export const SCRUB = 1;

/** Default ScrollTrigger entry points, so they are not re-guessed per section. */
export const START = {
  /** Below-fold content: finishing, not starting, when the eye lands on it. */
  enter: "top 82%",
  /** Content that must not be missed on short viewports. */
  enterLate: "top 95%",
  pin: "top top",
} as const;

/** Breakpoints for `gsap.matchMedia()`. Pins are desktop-only on purpose. */
export const MQ = {
  desktop: "(min-width: 1024px)",
  handheld: "(max-width: 1023px)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;

/** Root class the boot script sets; hidden start states hang off it. */
export const MOTION_READY_CLASS = "motion-ready";

/**
 * Reduced motion collapses tier 1 to opacity and drops tier 2 entirely.
 * Defined once here so no component invents its own fallback.
 */
export const REDUCED = {
  duration: 0.2,
  ease: "none",
} as const;
