"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import styles from "../landing.module.scss";

export type LxCategory = {
  id: string;
  label: string;
  href: string;
  image: string;
};

const COPY = {
  sr: { eyebrow: "(02) — Kolekcija", all: "Cela kolekcija" },
  en: { eyebrow: "(02) — Collection", all: "View everything" },
};

/**
 * A list, not a grid of cards. The image is a plate that follows the pointer;
 * the rows themselves only shift and dim, so nothing on screen ever looks
 * like a clickable tile.
 */
export default function LxCategories({
  lang,
  categories,
  allHref,
}: {
  lang: "sr" | "en";
  categories: LxCategory[];
  allHref: string;
}) {
  const plateRef = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const raf = useRef(0);
  const [active, setActive] = useState<string | null>(null);
  const copy = COPY[lang];

  const loop = useCallback(() => {
    const node = plateRef.current;
    if (!node) return;
    const p = pos.current;
    // Trailing the pointer by a fixed fraction each frame is what separates a
    // considered follow from a jittery one glued to the cursor.
    p.x += (p.tx - p.x) * 0.12;
    p.y += (p.ty - p.y) * 0.12;
    node.style.transform = `translate3d(${p.x - 140}px, ${p.y - 186}px, 0)`;
    raf.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (event: PointerEvent) => {
      pos.current.tx = event.clientX;
      pos.current.ty = event.clientY;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [loop]);

  const activeCategory = categories.find((item) => item.id === active) || null;

  return (
    <section className={`${styles.section} ${styles.paper} ${styles.cats}`}>
      <div className={styles.rails} aria-hidden>
        <span /><span /><span /><span />
      </div>

      <div className={styles.grid}>
        <div className={styles.catsHead}>
          <span className={styles.micro}>{copy.eyebrow}</span>
          <Link href={allHref} className={styles.rule}>
            {copy.all}
          </Link>
        </div>

        <ul
          className={`${styles.catList} ${active ? styles.catListHot : ""}`}
          onPointerLeave={() => setActive(null)}
        >
          {categories.map((category, index) => (
            <li
              key={category.id}
              className={styles.catRow}
              onPointerEnter={() => setActive(category.id)}
            >
              <Link href={category.href} className={`${styles.dLg} ${styles.catName}`}>
                {category.label}
              </Link>
              <span className={`${styles.micro} ${styles.catIndex}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.catThumbMobile}>
                <StorefrontImage
                  sources={[category.image]}
                  alt=""
                  width={96}
                  height={128}
                  sizes="96px"
                />
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div
        aria-hidden
        ref={plateRef}
        className={`${styles.catPlate} ${activeCategory ? styles.catPlateOn : ""}`}
      >
        {activeCategory ? (
          <StorefrontImage
            key={activeCategory.id}
            sources={[activeCategory.image]}
            alt=""
            width={280}
            height={373}
            sizes="280px"
          />
        ) : null}
      </div>
    </section>
  );
}
