"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMotion } from "@/app/components/motion/MotionProvider";
import { CURTAIN_LIFT_EVENT, type CurtainLiftDetail } from "@/lib/motion/curtain";

/**
 * Home-page intro.
 *
 * The previous version held for 260ms and faded out over 260ms, which read as
 * a flicker rather than an entrance — long enough to notice, too short to mean
 * anything. This one is a three-beat sequence: the mark is revealed, a rule
 * tracks real load progress, then a curtain lifts and hands off to the hero.
 *
 * Guard rails, because an intro that annoys is worse than no intro:
 *   - only on `/`, only once per session (StorefrontRuntimeShell owns that)
 *   - never blocks longer than MAX_HOLD_MS even if something stalls
 *   - prefers-reduced-motion skips straight to the page
 */

const MIN_HOLD_MS = 1150; // long enough to read the wordmark
const MAX_HOLD_MS = 3000; // hard ceiling regardless of network
const EXIT_MS = 1000; // curtain lift, overlaps the hero's own intro

type Phase = "enter" | "exit" | "done";

export default function StorefrontPreloader({ onExitComplete }: { onExitComplete?: () => void }) {
  const { lenis } = useMotion();
  const [phase, setPhase] = useState<Phase>("enter");
  const [progress, setProgress] = useState(0);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setPhase("done");
    onExitComplete?.();
  }, [onExitComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      finish();
      return;
    }

    const startedAt = window.performance.now();
    const timers: number[] = [];
    let released = false;
    let raf = 0;

    /* The rule creeps toward 90% on its own and only completes when the page
       actually reports ready. A bar that races to 100% and then waits is the
       tell of a fake loader. */
    const tick = () => {
      const elapsed = window.performance.now() - startedAt;
      const eased = 1 - Math.exp(-elapsed / 620);
      setProgress((current) => Math.max(current, Math.min(0.9, eased * 0.9)));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);

    const release = () => {
      if (released) return;
      released = true;

      const elapsed = window.performance.now() - startedAt;
      const wait = Math.max(0, MIN_HOLD_MS - elapsed);

      timers.push(
        window.setTimeout(() => {
          window.cancelAnimationFrame(raf);
          setProgress(1);
          // Let the rule visibly land before the curtain moves.
          timers.push(
            window.setTimeout(() => {
              setPhase("exit");
              /* Hand off to the hero. Without this the hero's entrance runs on
                 mount — behind a curtain that is still down — and is finished
                 before anyone can see it. HeroFx starts its timeline against
                 this event so the two overlap. */
              window.dispatchEvent(
                new CustomEvent<CurtainLiftDetail>(CURTAIN_LIFT_EVENT, { detail: { exitMs: EXIT_MS } }),
              );
              timers.push(window.setTimeout(finish, EXIT_MS));
            }, 260),
          );
        }, wait),
      );
    };

    if (document.readyState === "complete") {
      release();
    } else {
      window.addEventListener("load", release, { once: true });
    }
    timers.push(window.setTimeout(release, MAX_HOLD_MS));

    return () => {
      window.removeEventListener("load", release);
      window.cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [finish]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (phase === "done") return;

    // Nothing should scroll underneath the curtain. When Lenis is driving,
    // it has to be the one told to stop — `overflow: hidden` on the body
    // leaves Lenis still animating a scroll position that no longer moves,
    // and the page lurches when the curtain lifts.
    if (lenis) {
      lenis.stop();
      return () => lenis.start();
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lenis, phase]);

  if (phase === "done") return null;

  return (
    <div className={`lux-preloader${phase === "exit" ? " is-exiting" : ""}`} role="presentation" aria-hidden="true">
      {/* Two panels so the lift has depth — the back one trails the front. */}
      <span className="lux-preloader__panel lux-preloader__panel--back" />
      <span className="lux-preloader__panel lux-preloader__panel--front" />

      <div className="lux-preloader__mark">
        <span className="lux-preloader__logo">
          <Image
            src="/img/logo-header.png"
            alt=""
            width={360}
            height={110}
            priority
            sizes="(max-width: 640px) 220px, 300px"
          />
        </span>

        <span className="lux-preloader__caption">Tailored in Serbia</span>

        <span className="lux-preloader__rule">
          <span
            className="lux-preloader__rule-fill"
            style={{ transform: `scaleX(${progress.toFixed(3)})` }}
          />
        </span>
      </div>
    </div>
  );
}
