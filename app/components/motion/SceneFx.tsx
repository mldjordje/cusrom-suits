"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";
import { useMotion } from "@/app/components/motion/MotionProvider";
import { DIST, DUR, EASE, MQ, SCRUB, STAGGER, START } from "@/lib/motion/tokens";

/**
 * The storefront's only scroll-driven animation runtime.
 *
 * Replaces three of them: StorefrontViewportEffects (GSAP, deferred to idle),
 * LuxScrollFx (IntersectionObserver + a hand-rolled rAF parallax loop), and
 * the `whileInView` props that used to live inside Reveal, ProductItemMotion
 * and SectionHeadingReveal. Those three components are now markup only — they
 * emit the hooks below and nothing else, which also took them out of the
 * client bundle entirely.
 *
 * Markup contract
 * ---------------
 *   [data-m-rise]           rises and fades in once, distance from
 *                           `data-m-dist` (s | m | l), delay from
 *                           `data-m-delay` in seconds
 *   [data-m-card]           product card; animated as a grid-aware batch, so
 *                           a row reads as one wave rather than N fades
 *   [data-m-heading]        headline split into lines that ride up out of a
 *                           mask
 *   [data-m-parallax]       drifts against the scroll; strength in the value
 *
 * Legacy `lux-*` contract
 * -----------------------
 * `[data-lux-reveal]`, `.lux-lines`, `.lux-rule` and `[data-lux-parallax]`
 * are still driven exactly as santos-lux.scss expects — the class `is-in`,
 * the delay custom properties, the `--lux-parallax` offset. Their CSS is
 * good; only the runtime underneath changed. Do not "modernise" them without
 * rewriting that stylesheet at the same time.
 */

const LUX_ROOT = ".ss-lux";
const LUX_REVEAL_SELECTOR = "[data-lux-reveal], .lux-lines, .lux-rule";

/** Panels that carried their own reveal in StorefrontViewportEffects. */
const PANEL_SELECTOR = [".ss-filter-panel", ".product-single__details-tab", ".ss-product-glass-card"].join(", ");

/** Media that drifts inside a fixed frame. */
const MEDIA_PARALLAX = [
  [".ss-banner-panel", ".ss-banner-panel img"],
  [".ss-story-card", ".ss-story-card img"],
] as const;

const distanceFor = (el: Element) => {
  const key = (el as HTMLElement).dataset.mDist;
  if (key === "s") return DIST.s;
  if (key === "l") return DIST.l;
  return DIST.m;
};

const delayFor = (el: Element) => {
  const raw = Number((el as HTMLElement).dataset.mDelay);
  return Number.isFinite(raw) ? raw : 0;
};

/**
 * `will-change` is a promise to the compositor, not a speed switch. Held on
 * a dozen elements at once it costs more than it saves, so it goes on for the
 * duration of a tween and comes straight back off.
 */
const promote = (target: Element | Element[]) => {
  const list = Array.isArray(target) ? target : [target];
  list.forEach((el) => el.classList.add("is-animating"));
};
const demote = (target: Element | Element[]) => {
  const list = Array.isArray(target) ? target : [target];
  list.forEach((el) => el.classList.remove("is-animating"));
};

export default function SceneFx() {
  /* Pathname only — see the note in MotionProvider about useSearchParams
     outside a Suspense boundary taking down every client effect on the page. */
  const pathname = usePathname() || "";
  const { reduceMotion } = useMotion();
  const splitsRef = useRef<SplitText[]>([]);

  useGSAP(
    () => {
      if (reduceMotion) return;

      const luxRoot = document.querySelector<HTMLElement>(LUX_ROOT);
      let cancelled = false;

      /* Nothing here clears the boot script's failsafe, on purpose.
         Every start state below is also written inline by GSAP at creation
         time, and an inline style beats the `.motion-ready` rule. So when the
         timer fires and pulls the class:
           - if this ran, the class was already doing nothing  -> no-op;
           - if this never ran (throw, chunk 404), the class was the only
             thing hiding the page -> the page becomes readable.
         Which is exactly the behaviour wanted in both directions, with no
         handshake to get wrong. */

      /* ---- generic rise ------------------------------------------------ */

      gsap.utils.toArray<HTMLElement>("[data-m-rise]").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: distanceFor(el) },
          {
            opacity: 1,
            y: 0,
            duration: DUR.section,
            delay: delayFor(el),
            ease: EASE.out,
            // No clearProps on opacity: the CSS start state is keyed on
            // `.motion-ready`, so clearing the inline value would hand the
            // element straight back to `opacity: 0`.
            onStart: () => promote(el),
            onComplete: () => demote(el),
            scrollTrigger: { trigger: el, start: START.enter, once: true },
          },
        );
      });

      /* ---- product grids ------------------------------------------------
         One batch per page rather than one tween per card. `grid: "auto"`
         makes the stagger follow the visual layout, so a row arrives as a
         wave travelling across it instead of eight independent fades. */

      const cards = gsap.utils.toArray<HTMLElement>("[data-m-card]");
      if (cards.length > 0) {
        // Written inline rather than left to the CSS class, so the failsafe
        // above cannot uncover a card that has not been animated yet — that
        // would show it, then hide and re-reveal it once scrolled into view.
        gsap.set(cards, { opacity: 0, y: DIST.m, clipPath: "inset(12% 0% 0% 0%)" });

        ScrollTrigger.batch(cards, {
          start: START.enter,
          once: true,
          onEnter: (batch) => {
            promote(batch);
            gsap.to(batch, {
              opacity: 1,
              y: 0,
              clipPath: "inset(0% 0% 0% 0%)",
              duration: DUR.section,
              ease: EASE.out,
              overwrite: true,
              stagger: { each: STAGGER.tight, grid: "auto", from: "start" },
              onComplete: () => demote(batch),
            });
          },
        });
      }

      /* ---- headlines ----------------------------------------------------
         Deliberately deferred until the webfonts have settled: splitting
         against a fallback face measures the wrong line breaks, and the
         re-split that follows is visible. `autoSplit` then re-runs this on
         resize, and `onSplit` returning the tween lets GSAP clean up the old
         one for us. */

      const headings = gsap.utils.toArray<HTMLElement>("[data-m-heading]");
      if (headings.length > 0) {
        document.fonts.ready.then(() => {
          // useGSAP's revert cannot reach inside this promise, so the flag is
          // what stops a late resolve from splitting an unmounted tree.
          if (cancelled) return;
          headings.forEach((el) => {
            const split = SplitText.create(el, {
              type: "lines",
              mask: "lines",
              autoSplit: true,
              // Screen readers get the original text, not the line soup.
              aria: "auto",
              onSplit: (self) =>
                gsap.from(self.lines, {
                  yPercent: 110,
                  duration: DUR.display,
                  ease: EASE.out,
                  stagger: STAGGER.normal,
                  scrollTrigger: { trigger: el, start: START.enter, once: true },
                }),
            });
            splitsRef.current.push(split);
          });
          ScrollTrigger.refresh();
        });
      }

      /* ---- parallax ----------------------------------------------------- */

      gsap.utils.toArray<HTMLElement>("[data-m-parallax]").forEach((el) => {
        const strength = Number(el.dataset.mParallax) || 0.1;
        gsap.fromTo(
          el,
          { yPercent: -strength * 100 },
          {
            yPercent: strength * 100,
            ease: "none",
            scrollTrigger: {
              trigger: el.parentElement || el,
              start: "top bottom",
              end: "bottom top",
              scrub: SCRUB,
            },
          },
        );
      });

      MEDIA_PARALLAX.forEach(([frame, media]) => {
        gsap.utils.toArray<HTMLElement>(media).forEach((el) => {
          const section = el.closest(frame);
          if (!section) return;
          gsap.fromTo(
            el,
            { yPercent: -4, scale: 1.04 },
            {
              yPercent: 4,
              scale: 1.1,
              ease: "none",
              scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: SCRUB },
            },
          );
        });
      });

      /* ---- P3 editorial pins ------------------------------------------- */

      const editorialMedia = gsap.matchMedia();
      editorialMedia.add(MQ.desktop, () => {
        gsap.utils.toArray<HTMLElement>("[data-m-collection-rail]").forEach((section) => {
          const track = section.querySelector<HTMLElement>("[data-m-collection-track]");
          if (!track) return;
          const travel = () => Math.max(0, track.scrollWidth - section.clientWidth + 96);
          gsap.to(track, {
            x: () => -travel(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: START.pin,
              end: () => `+=${Math.max(window.innerWidth, travel() * 1.15)}`,
              pin: true,
              scrub: SCRUB,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-m-tailoring-story]").forEach((section) => {
          const image = section.querySelector<HTMLElement>(".ss-editorial-banner__img");
          const copy = section.querySelector<HTMLElement>("[data-m-tailoring-copy]");
          const steps = gsap.utils.toArray<HTMLElement>("[data-m-tailoring-step]", section);
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: START.pin,
              end: "+=180%",
              pin: true,
              scrub: SCRUB,
              anticipatePin: 1,
            },
          });
          if (image) timeline.fromTo(image, { scale: 1.08, xPercent: 0 }, { scale: 1.18, xPercent: 4, ease: "none" }, 0);
          if (copy) timeline.fromTo(copy, { yPercent: 5 }, { yPercent: -5, ease: "none" }, 0);
          steps.forEach((step, index) => {
            timeline.call(() => steps.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === index)), [], index / Math.max(1, steps.length - 1));
          });
        });
      });

      /* Handheld gets the same authored scroll language without fixed pins.
         Pinning against Safari's collapsing address bar causes jumps; scrubbed
         depth and chapter changes retain the narrative while native scrolling
         remains fully in charge. */
      editorialMedia.add(MQ.handheld, () => {
        gsap.utils.toArray<HTMLElement>(".ss-home-page .section-title").forEach((heading) => {
          gsap.fromTo(
            heading,
            { xPercent: -8 },
            {
              xPercent: 0,
              ease: "none",
              scrollTrigger: { trigger: heading, start: "top 96%", end: "top 58%", scrub: 0.7 },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>(".ss-home-page .ss-uniform-tile").forEach((image, index) => {
          const frame = image.closest(".ss-featured-tile") || image.parentElement;
          if (!frame) return;
          gsap.fromTo(
            image,
            { yPercent: index % 2 === 0 ? -4 : 3, scale: 1.045 },
            {
              yPercent: index % 2 === 0 ? 4 : -3,
              scale: 1.09,
              ease: "none",
              scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 0.9 },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-m-collection-rail] .ss-category-tile").forEach((tile, index) => {
          gsap.fromTo(
            tile,
            { y: index % 2 === 0 ? 34 : 62, scale: 0.94 },
            {
              y: index % 2 === 0 ? -12 : -28,
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: tile, start: "top 95%", end: "bottom 28%", scrub: 0.8 },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-m-tailoring-story]").forEach((section) => {
          const image = section.querySelector<HTMLElement>(".ss-editorial-banner__img");
          const steps = gsap.utils.toArray<HTMLElement>("[data-m-tailoring-step]", section);
          if (image) {
            gsap.fromTo(image, { scale: 1.04, yPercent: -3 }, {
              scale: 1.14,
              yPercent: 4,
              ease: "none",
              scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.9 },
            });
          }
          if (steps.length > 0) {
            ScrollTrigger.create({
              trigger: section,
              start: "top 78%",
              end: "bottom 32%",
              onUpdate: (self) => {
                const active = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
                steps.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === active));
              },
            });
          }
        });
      });

      /* ---- panels that brought their own reveal ------------------------- */

      gsap.utils.toArray<HTMLElement>(PANEL_SELECTOR).forEach((el, index) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: DIST.s },
          {
            autoAlpha: 1,
            y: 0,
            duration: DUR.body,
            delay: Math.min(index * 0.02, 0.12),
            ease: EASE.out,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: el, start: START.enter, once: true },
          },
        );
      });

      /* ---- legacy lux contract ------------------------------------------
         Same classes and custom properties LuxScrollFx wrote, produced by the
         one runtime instead of a second observer. */

      if (luxRoot) {
        luxRoot.classList.add("lux-fx-ready");

        luxRoot.querySelectorAll<HTMLElement>("[data-lux-reveal-stagger]").forEach((group) => {
          Array.from(group.children).forEach((child, index) => {
            (child as HTMLElement).style.setProperty("--lux-reveal-delay", `${index * 90}ms`);
          });
        });

        luxRoot.querySelectorAll<HTMLElement>(".lux-lines").forEach((headline) => {
          headline.querySelectorAll<HTMLElement>(".lux-lines__inner").forEach((line, index) => {
            line.style.setProperty("--lux-line-delay", `${index * 110}ms`);
          });
        });

        gsap.utils.toArray<HTMLElement>(LUX_REVEAL_SELECTOR).forEach((el) => {
          ScrollTrigger.create({
            trigger: el,
            start: START.enter,
            once: true,
            onEnter: () => el.classList.add("is-in"),
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-lux-parallax]").forEach((el) => {
          const strength = Number(el.dataset.luxParallax) || 0.12;
          const shift = () => window.innerHeight * strength;
          gsap.fromTo(
            el,
            { "--lux-parallax": `${-shift()}px` },
            {
              "--lux-parallax": `${shift()}px`,
              ease: "none",
              scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: SCRUB },
            },
          );
        });
      }

      ScrollTrigger.refresh();

      return () => {
        cancelled = true;
        splitsRef.current.forEach((split) => split.revert());
        splitsRef.current = [];
        luxRoot?.classList.remove("lux-fx-ready");
        editorialMedia.revert();
      };
    },
    { dependencies: [pathname, reduceMotion], revertOnUpdate: true },
  );

  return null;
}
