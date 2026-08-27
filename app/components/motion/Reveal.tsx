/**
 * A section that rises into view once.
 *
 * Markup only — no "use client", no framer-motion, no hooks. It emits the
 * hooks SceneFx binds to, which is why the same call sites in page.tsx now
 * cost nothing in the client bundle. Reduced motion is handled upstream: the
 * boot script never sets `.motion-ready`, so the CSS start state never
 * applies and SceneFx never runs.
 */

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Seconds. Kept small — this is cadence between siblings, not suspense. */
  delay?: number;
  /**
   * Travel distance. Defaults by tag, because a section and a card should not
   * arrive with the same weight: section -> l, article/div -> m.
   */
  dist?: "s" | "m" | "l";
  as?: "div" | "section" | "article";
  /**
   * @deprecated Ignored. Distance now comes from `dist`, and the old prop was
   * clamped to 14px anyway — below the point where a move reads as intent.
   */
  y?: number;
  /**
   * @deprecated Ignored. The entry point is one value for the whole site,
   * `START.enter` in lib/motion/tokens.ts.
   */
  amount?: number;
};

export default function Reveal({ children, className, id, delay = 0, dist, as = "div" }: RevealProps) {
  const Tag = as;
  const resolved = dist ?? (as === "section" ? "l" : "m");

  return (
    <Tag className={className} id={id} data-m-rise="" data-m-dist={resolved} data-m-delay={delay || undefined}>
      {children}
    </Tag>
  );
}
