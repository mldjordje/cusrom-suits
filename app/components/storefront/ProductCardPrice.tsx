import { resolveCardPrice, type CardPriceInput } from "@/lib/catalog/pricing";

/**
 * The one place a listing card's price is rendered.
 *
 * The landing page and the shop grid used to format prices independently — the
 * landing quoted the highest variant while the grid quoted the collapse
 * representative, so the same article could show two different numbers
 * depending on which page you came from. Both now render this.
 */

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default function ProductCardPrice({
  item,
  isEn = false,
  businessUniform = false,
  className = "product-card__price d-flex",
  // Some call sites sit inside a <span> (the featured tile meta/overlay), where
  // a <div> would be invalid HTML — hence the element override, and "none" for
  // slots that supply their own wrapper.
  as = "div",
}: {
  item: CardPriceInput;
  isEn?: boolean;
  businessUniform?: boolean;
  className?: string;
  as?: "div" | "span" | "none";
}) {
  const price = resolveCardPrice(item, { businessUniform });

  const body =
    price.kind === "inquiry" ? (
      <span className="money price">{isEn ? "Inquiry only" : "Na upit"}</span>
    ) : price.kind === "range" ? (
      <span className="money price">
        {isEn ? "from" : "od"} {formatRsd(price.from)}
      </span>
    ) : price.kind === "sale" ? (
      <>
        <span className="money price price-old">{formatRsd(price.gross)}</span>
        <span className="money price price-sale">{formatRsd(price.final)}</span>
      </>
    ) : (
      <span className="money price">{formatRsd(price.final)}</span>
    );

  if (as === "none") return body;
  if (as === "span") return <span className={className}>{body}</span>;
  return <div className={className}>{body}</div>;
}

/** True when the card shows a range, so callers can suppress a "-X%" badge that
 *  would only be accurate for one variant. */
export const hasCardPriceRange = (item: CardPriceInput, businessUniform = false) =>
  resolveCardPrice(item, { businessUniform }).kind === "range";
