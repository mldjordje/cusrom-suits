"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import styles from "../landing.module.scss";
import { getMotion, isCoarse } from "./_fx/motion";

type BespokeStep = {
  index: string;
  sub: string;
  title: string;
  copy: string;
  cta?: string;
  href?: string;
  mediaType: "video" | "image";
  mediaSrc: string;
};

const CRAFT_VIDEO =
  "/fajlovi/site-assets/2026-08-20/1787230677551-680a41ea-75c9-4843-b64c-9c8f4a867eb5-proizvodnja-santos-video.mp4";

/** Phase III draws this stitch line in sync with the scroll. */
const THREAD_PATH =
  "M0 62 C 120 20, 210 96, 330 54 S 560 12, 690 62 S 920 104, 1060 48 S 1290 8, 1440 58";

const COPY: Record<"sr" | "en", { eyebrow: string; hint: string; steps: BespokeStep[] }> = {
  sr: {
    eyebrow: "(03) — Sartoria & Zanat",
    hint: "Skrolujte — vi krojite",
    steps: [
      {
        index: "I",
        sub: "SELEZIONE TESSUTI",
        title: "Vuna koja se bira, ne naručuje",
        copy: "Vitale Barberis Canonico i Loro Piana. Balirana u Bielli, tkana za prirodan pad, prozračnost i postojanost koja ne popušta posle višegodišnjeg nošenja.",
        mediaType: "video",
        mediaSrc: CRAFT_VIDEO,
      },
      {
        index: "II",
        sub: "SPALLA CAMICIA",
        title: "Napuljsko meko rame",
        copy: "Rukav se ručno uvlači u otvor ramena poput finih italijanskih košulja, bez krutog sunđerastog uloška. Odelo prati vaš prirodni pokret umesto da stvara oklop.",
        mediaType: "image",
        mediaSrc: "/img/odela-luxury.jpg",
      },
      {
        index: "III",
        sub: "PUNTO A MANO",
        title: "AMF zanatlijski ručni štep",
        copy: "Karakterističan milimetarski bod duž ivica revera, preklopa džepova i manžetni, rađen rukom naših majstora. Diskretni znak istinskog bespoke krojenja.",
        mediaType: "image",
        mediaSrc: "/img/aksesoari-luxury.jpg",
      },
      {
        index: "IV",
        sub: "MISURA ANATOMICA",
        title: "Vaša anatomska mera",
        copy: "Preko šezdeset preciznih mera tela, tri personalne probe i unikatni digitalni kroj koji ostaje trajno sačuvan u arhivi našeg ateljea za sve buduće kreacije.",
        cta: "Konfigurišite odelo po meri",
        href: "/custom-suits",
        mediaType: "image",
        mediaSrc: "/img/odela2.webp",
      },
    ],
  },
  en: {
    eyebrow: "(03) — Sartoria & Craft",
    hint: "Scroll — you are cutting the cloth",
    steps: [
      {
        index: "I",
        sub: "SELEZIONE TESSUTI",
        title: "Cloth that is chosen, not ordered",
        copy: "Vitale Barberis Canonico and Loro Piana. Baled in Biella, woven for natural drape, breathability and a resilience that holds its line for years.",
        mediaType: "video",
        mediaSrc: CRAFT_VIDEO,
      },
      {
        index: "II",
        sub: "SPALLA CAMICIA",
        title: "The soft Neapolitan shoulder",
        copy: "The sleeve is set into the shoulder by hand, the way fine Italian shirts are made, with no rigid padding. The jacket follows your movement instead of armouring it.",
        mediaType: "image",
        mediaSrc: "/img/odela-luxury.jpg",
      },
      {
        index: "III",
        sub: "PUNTO A MANO",
        title: "AMF hand stitching",
        copy: "The millimetre stitch that runs the lapel edge, pocket flaps and cuffs, worked by our masters' own hands. The quiet signature of true bespoke.",
        mediaType: "image",
        mediaSrc: "/img/aksesoari-luxury.jpg",
      },
      {
        index: "IV",
        sub: "MISURA ANATOMICA",
        title: "Your anatomical measure",
        copy: "Over sixty precise body measurements, three personal fittings and a unique digital pattern kept in our atelier archive for every future commission.",
        cta: "Configure your bespoke suit",
        href: "/custom-suits?lang=en",
        mediaType: "image",
        mediaSrc: "/img/odela2.webp",
      },
    ],
  },
};

/**
 * The centre of the page: a pinned scrub. The section locks, and from that
 * point the wheel is no longer scrolling the document — it is driving a
 * timeline through the four stages of making a suit. Media wipes up from the
 * bottom edge, copy hands over phase by phase, and on stage III a gold thread
 * draws itself stitch by stitch under the reader's own finger.
 *
 * Below 900px and under reduced-motion the same four phases render as an
 * ordinary stacked sequence — same content, no pin, no scrub.
 */
export default function LxBespoke({
  lang,
  shots: _shots,
}: {
  lang: "sr" | "en";
  shots?: string[];
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(0);
  const copy = COPY[lang];
  const total = copy.steps.length;

  // Pinned scrub timeline. Desktop only — matchMedia tears the pin down itself
  // when the viewport crosses the breakpoint, spacers included.
  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    let ctx: { revert: () => void } | null = null;
    let dead = false;

    void getMotion().then((core) => {
      if (dead || !core) return;
      const { gsap, ScrollTrigger } = core;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add("(min-width: 901px)", () => {
          const shots = gsap.utils.toArray<HTMLElement>(`.${styles.craftShot}`);
          const phases = gsap.utils.toArray<HTMLElement>(`.${styles.craftPhase}`);
          const thread = section.querySelector<SVGSVGElement>(`.${styles.craftThread}`);
          const threadPath = section.querySelector<SVGPathElement>(
            `.${styles.craftThreadPath}`,
          );

          gsap.set(shots.slice(1), { clipPath: "inset(100% 0 0 0)", opacity: 1 });
          gsap.set(shots[0], { clipPath: "inset(0% 0 0 0)", opacity: 1 });
          gsap.set(phases.slice(1), { opacity: 0, y: 34 });
          gsap.set(phases[0], { opacity: 1, y: 0 });

          if (threadPath) {
            const length = threadPath.getTotalLength();
            gsap.set(threadPath, {
              strokeDasharray: length,
              strokeDashoffset: length,
            });
          }

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: pin,
              start: "top top",
              // One viewport of scroll distance per handover.
              end: () => `+=${window.innerHeight * (total - 1) * 1.1}`,
              pin: true,
              scrub: 0.9,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const index = Math.min(
                  total - 1,
                  Math.floor(self.progress * total * 0.999),
                );
                setActive((previous) => (previous === index ? previous : index));
              },
            },
          });

          for (let index = 1; index < total; index += 1) {
            const position = index - 1;

            timeline
              .to(
                shots[index],
                { clipPath: "inset(0% 0 0 0)", duration: 1, ease: "power2.inOut" },
                position,
              )
              // The outgoing frame keeps drifting so the wipe reads as depth,
              // not as two flat cards swapping places.
              .to(shots[index - 1], { scale: 1.06, duration: 1 }, position)
              .to(phases[index - 1], { opacity: 0, y: -28, duration: 0.4 }, position)
              .to(
                phases[index],
                { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
                position + 0.42,
              );

            // Stage III: the stitch draws itself as the reader scrolls it.
            if (index === 2 && thread && threadPath) {
              timeline
                .to(thread, { opacity: 1, duration: 0.3 }, position + 0.3)
                .to(threadPath, { strokeDashoffset: 0, duration: 0.9 }, position + 0.35)
                .to(thread, { opacity: 0, duration: 0.3 }, position + 1.05);
            }
          }
        });

        ScrollTrigger.refresh();
      }, section);
    });

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, [total]);

  // Keep the craft footage paused unless it is on screen.
  useEffect(() => {
    const node = videoRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void node.play().catch(() => undefined);
        else node.pause();
      },
      { threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Rail clicks jump the page to the matching slice of the pinned range.
  const jumpTo = (index: number) => {
    const pin = pinRef.current;
    if (!pin) return;

    if (isCoarse() || window.innerWidth <= 900) {
      const phase = pin.querySelectorAll(`.${styles.craftPhase}`)[index];
      phase?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const top = pin.getBoundingClientRect().top + window.scrollY;
    const span = window.innerHeight * (total - 1) * 1.1;
    window.scrollTo({
      top: top + (span * index) / total + 8,
      behavior: "smooth",
    });
  };

  return (
    <section ref={sectionRef} className={styles.craft} id="sartoria">
      <div className={styles.craftHead}>
        <span className={styles.micro}>{copy.eyebrow}</span>
        <span className={styles.micro}>{copy.hint}</span>
      </div>

      <div ref={pinRef} className={styles.craftPin}>
        {/* Media stage — one wipe per phase */}
        <div className={styles.craftStage}>
          {copy.steps.map((step, index) => (
            <div
              key={step.index}
              className={`${styles.craftShot} ${index === 0 ? styles.craftShotFirst : ""}`}
            >
              {step.mediaType === "video" ? (
                <video
                  ref={videoRef}
                  src={step.mediaSrc}
                  poster="/img/odela-luxury.jpg"
                  muted
                  loop
                  playsInline
                  preload="none"
                />
              ) : (
                <StorefrontImage
                  sources={[step.mediaSrc]}
                  fallbackSrc="/img/odela-luxury.jpg"
                  alt={step.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 52vw"
                />
              )}
            </div>
          ))}

          <div className={styles.craftStageScrim} />

          <svg
            className={styles.craftThread}
            viewBox="0 0 1440 110"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className={styles.craftThreadPath} d={THREAD_PATH} />
          </svg>
        </div>

        {/* Copy panel — phases stack absolutely on desktop, flow on mobile */}
        <div className={styles.craftPanel}>
          {copy.steps.map((step, index) => (
            <article
              key={step.index}
              className={`${styles.craftPhase} ${index === 0 ? styles.craftPhaseFirst : ""}`}
            >
              <span className={styles.craftPhaseNum}>
                {step.index} — {`0${index + 1}`} / {`0${total}`}
              </span>
              <span className={styles.craftPhaseSub}>{step.sub}</span>
              <h3 className={styles.craftPhaseTitle}>{step.title}</h3>
              <p className={styles.craftPhaseCopy}>{step.copy}</p>

              {step.cta && step.href ? (
                <div className={styles.craftPhaseCta}>
                  <Link href={step.href} className={styles.heroPrimaryBtn}>
                    <span>{step.cta}</span>
                    <svg
                      className={styles.heroArrow}
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {/* Phase rail — reachable by keyboard, unlike the old clickable divs */}
        <div className={styles.craftRail}>
          {copy.steps.map((step, index) => (
            <button
              key={step.index}
              type="button"
              onClick={() => jumpTo(index)}
              className={`${styles.craftRailStep} ${
                index <= active ? styles.craftRailStepOn : ""
              }`}
              aria-label={`${step.index} — ${step.title}`}
              aria-current={index === active}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
