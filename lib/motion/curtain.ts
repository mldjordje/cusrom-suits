/**
 * Handoff between the home-page preloader and the hero's entrance.
 *
 * Without it the hero animates on mount, behind a curtain that is still down,
 * and the visitor's first impression is a hero that is simply *there*. The
 * preloader announces the moment its curtain starts lifting and how long the
 * lift takes; the hero starts its own timeline so that the two overlap by
 * OVERLAP_MS rather than running back to back.
 */

export const CURTAIN_LIFT_EVENT = "ss:curtain-lift";

/** How far into the curtain lift the hero should begin. */
export const OVERLAP_MS = 400;

export type CurtainLiftDetail = {
  /** Total duration of the curtain lift, in milliseconds. */
  exitMs: number;
};

/**
 * Seconds the hero should wait after the lift starts. Negative overlap is
 * clamped away: a hero that starts before the curtain moves is just a hero
 * animating behind a curtain again.
 */
export const heroDelayFor = (exitMs: number) => Math.max(0, exitMs - OVERLAP_MS) / 1000;
