import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import TiltedCard from "@/app/components/motion/TiltedCard";

type Props = {
  href: string;
  primarySrc: string;
  hoverSrc?: string;
  title: string;
  categoryLabel: string;
  price: React.ReactNode;
  isNew?: boolean;
  isSale?: boolean;
  sizes?: string;
};

export default function PremiumProductCard({
  href,
  primarySrc,
  hoverSrc,
  title,
  categoryLabel,
  price,
  isNew,
  isSale,
  sizes = "(max-width: 767px) 48vw, (max-width: 1199px) 24vw, 360px",
}: Props) {
  const hasHover = Boolean(hoverSrc && hoverSrc !== primarySrc);

  return (
    <TiltedCard maxAngle={5} scale={1.015} className="h-100">
      <Link href={href} prefetch={false} className="ss-premium-card d-block text-decoration-none h-100">
        <div className="ss-premium-card__img-wrap position-relative overflow-hidden">
          {/* Primary image */}
          <StorefrontImage
            sources={[primarySrc]}
            fallbackSrc="/img/odela.jpg"
            width={400}
            height={533}
            alt={title}
            className={`ss-premium-card__img ss-premium-card__img--primary${hasHover ? " ss-premium-card__img--has-hover" : ""}`}
            sizes={sizes}
          />

          {/* Hover image */}
          {hasHover ? (
            <StorefrontImage
              sources={[hoverSrc as string]}
              fallbackSrc="/img/odela.jpg"
              width={400}
              height={533}
              alt={title}
              className="ss-premium-card__img ss-premium-card__img--hover"
              sizes={sizes}
            />
          ) : null}

          {/* Badges */}
          {isNew && !isSale ? (
            <span className="ss-premium-card__badge ss-premium-card__badge--new">Novo</span>
          ) : null}
          {isSale ? (
            <span className="ss-premium-card__badge ss-premium-card__badge--sale">Akcija</span>
          ) : null}

          {/* Quick view overlay */}
          <div className="ss-premium-card__overlay" aria-hidden="true">
            <span className="ss-premium-card__overlay-label">Istraži Model &rarr;</span>
          </div>
        </div>

        {/* Info section */}
        <div className="ss-premium-card__info pt-3">
          {categoryLabel ? (
            <p className="ss-premium-card__category text-uppercase mb-1">{categoryLabel}</p>
          ) : null}
          <h6 className="ss-premium-card__title mb-1">{title}</h6>
          <div className="ss-premium-card__price">{price}</div>
        </div>
      </Link>
    </TiltedCard>
  );
}
