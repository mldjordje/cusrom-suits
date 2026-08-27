/**
 * A section headline whose lines ride up out of a mask.
 *
 * Markup only; SceneFx does the splitting with GSAP's SplitText once the
 * webfonts have settled. Splitting before that measures line breaks against
 * the fallback face and the correction is visible.
 *
 * The heading previously faded and slid 18px like everything else on the
 * page. A headline is the one place on a section worth spending a distinct
 * gesture on, so it gets its own.
 */

type Props = {
  className?: string;
  children: React.ReactNode;
};

export default function SectionHeadingReveal({ className, children }: Props) {
  return (
    <h2 className={className} data-m-heading="">
      {children}
    </h2>
  );
}
