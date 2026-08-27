"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useMotion } from "@/app/components/motion/MotionProvider";
import { CURTAIN_LIFT_EVENT, heroDelayFor, type CurtainLiftDetail } from "@/lib/motion/curtain";
import { DUR, EASE, MQ, SCRUB, STAGGER } from "@/lib/motion/tokens";

/**
 * The hero's entrance and its scroll behaviour.
 *
 * Replaces HeroParallaxFx, which only did a small parallax and loaded GSAP
 * a second time from inside `requestIdleCallback` — by which point a visitor
 * on a slower machine had usually started scrolling already, so the motion
 * read as a glitch rather than as direction.
 *
 * Two things happen here, and they are deliberately different in kind:
 *
 *   Entrance (once)  the media settles out of a slight over-scale, the eyebrow
 *                    arrives by tightening its tracking rather than by moving,
 *                    the headline's lines ride up out of a mask, the gold rule
 *                    draws, the CTA follows. Held paused until the preloader
 *                    curtain starts lifting, so the two overlap.
 *
 *   Scrub (desktop)  the hero is pinned for a little over half a screen while
 *                    the copy rises and the overlay deepens, so the next
 *                    section climbs over a held hero instead of the whole
 *                    block sliding away. Never on handheld: iOS Safari
 *                    changes viewport height mid-scroll when the address bar
 *                    hides, and a pin measured against the old height jumps.
 */

type Props = {
  targetId: string;
};

export default function HeroFx({ targetId }: Props) {
  const { reduceMotion } = useMotion();
  const splitRef = useRef<SplitText | null>(null);

  useGSAP(
    () => {
      if (reduceMotion) return;

      const root = document.getElementById(targetId);
      if (!root) return;

      const q = gsap.utils.selector(root);
      const media = q(".ss-home18-hero__media");
      const overlay = q(".ss-home18-hero__overlay");
      const intro = q("[data-hero-intro]");
      const eyebrow = q("[data-hero-eyebrow]");
      const rule = q("[data-hero-rule]");
      const title = q("[data-hero-title]");
      const cta = q("[data-hero-cta]");
      const cards = q("[data-hero-card]");
      const cue = q("[data-hero-cue]");

      /* ---- entrance ----------------------------------------------------- */

      const intro_tl = gsap.timeline({ paused: true });

      if (media.length) {
        intro_tl.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: EASE.out }, 0);
      }

      if (eyebrow.length) {
        // Tracking, not travel. An eyebrow that slides is one more thing
        // moving; an eyebrow that tightens reads as type setting itself.
        intro_tl.fromTo(
          eyebrow,
          { opacity: 0, letterSpacing: "0.4em" },
          { opacity: 1, letterSpacing: "0.24em", duration: DUR.hero, ease: EASE.out },
          0.1,
        );
      }

      if (title.length) {
        const split = SplitText.create(title[0], {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          aria: "auto",
        });
        splitRef.current = split;
        gsap.set(title, { opacity: 1 });
        intro_tl.from(
          split.lines,
          { yPercent: 110, duration: DUR.hero, ease: EASE.out, stagger: STAGGER.normal },
          0.2,
        );
      }

      if (rule.length) {
        intro_tl.fromTo(
          rule,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.9, ease: EASE.out, transformOrigin: "left center" },
          0.35,
        );
      }

      if (cta.length) {
        intro_tl.fromTo(cta, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: DUR.body, ease: EASE.out }, 0.7);
      }

      if (cards.length) {
        intro_tl.fromTo(
          cards,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: DUR.section, ease: EASE.out, stagger: STAGGER.tight },
          0.8,
        );
      }

      if (cue.length) {
        intro_tl.fromTo(cue, { opacity: 0 }, { opacity: 1, duration: DUR.body, ease: EASE.out }, 1);
      }

      /* Start against the curtain, if there is one. The preloader mounts a
         tick after this runs, so a missing element on the first frame is not
         proof that there is no curtain — hence the second look on the next
         frame rather than starting immediately. */
      let started = false;
      const start = (delay = 0) => {
        if (started) return;
        started = true;
        intro_tl.delay(delay).play(0);
      };

      const onCurtainLift = (event: Event) => {
        const detail = (event as CustomEvent<CurtainLiftDetail>).detail;
        start(heroDelayFor(detail?.exitMs ?? 0));
      };
      window.addEventListener(CURTAIN_LIFT_EVENT, onCurtainLift, { once: true });

      const probe = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!document.querySelector(".lux-preloader")) start(0);
        });
      });

      /* Last resort. If the curtain never announces itself — the preloader
         threw, a timer was dropped by a backgrounded tab — the hero must not
         sit at opacity 0 forever waiting for a signal that is not coming. */
      const rescue = window.setTimeout(() => start(0), 4000);

      /* ---- scroll ------------------------------------------------------- */

      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const pinned = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "+=60%",
            pin: true,
            pinSpacing: true,
            scrub: SCRUB,
            // The pin spacer must not become the page's new scroll height on
            // a route where the hero is the only tall thing.
            invalidateOnRefresh: true,
          },
        });

        if (intro.length) pinned.to(intro, { yPercent: -18, ease: "none" }, 0);
        if (media.length) pinned.to(media, { scale: 1.06, ease: "none" }, 0);
        if (overlay.length) pinned.fromTo(overlay, { opacity: 0.35 }, { opacity: 0.75, ease: "none" }, 0);
        if (cards.length) pinned.to(cards, { yPercent: -14, ease: "none", stagger: 0.04 }, 0);
      });

      mm.add(MQ.handheld, () => {
        if (!media.length) return;
        gsap.to(media, {
          yPercent: 15,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: SCRUB },
        });
      });

      /* The cue is direction, not decoration — once the visitor has taken the
         hint it has no reason to still be there. */
      if (cue.length) {
        ScrollTrigger.create({
          trigger: root,
          start: "top top-=120",
          onEnter: () => gsap.to(cue, { opacity: 0, duration: DUR.state, ease: EASE.state }),
          onLeaveBack: () => gsap.to(cue, { opacity: 1, duration: DUR.state, ease: EASE.state }),
        });
      }

      return () => {
        cancelAnimationFrame(probe);
        window.clearTimeout(rescue);
        window.removeEventListener(CURTAIN_LIFT_EVENT, onCurtainLift);
        mm.revert();
        splitRef.current?.revert();
        splitRef.current = null;
      };
    },
    { dependencies: [reduceMotion, targetId] },
  );

  return null;
}
