/**
 * One product card in a grid.
 *
 * Markup only. The animation is a single `ScrollTrigger.batch` in SceneFx
 * rather than a tween per card: with `grid: "auto"` the stagger follows the
 * visual layout, so a row arrives as one wave travelling across it. The old
 * per-item version gave every card its own independent 0.52s fade, which at
 * eight cards a row read as noise rather than as a grid filling in.
 *
 * `index` is no longer used for the delay — the batch derives order from
 * position on screen, which survives reordering and responsive column counts.
 * It stays in the signature so call sites in page.tsx did not have to change.
 */

type ProductItemMotionProps = {
  children: React.ReactNode;
  /** @deprecated Ignored; the batch staggers by grid position instead. */
  index?: number;
  className?: string;
};

export default function ProductItemMotion({ children, className }: ProductItemMotionProps) {
  return (
    <div className={className} data-m-card="">
      {children}
    </div>
  );
}
