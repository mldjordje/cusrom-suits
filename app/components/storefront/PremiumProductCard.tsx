import Link from "next/link";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

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
  sizes = "(max-width: 767px) 48vw, (max-width: 1199px) 24vw, 330px",
}: Props) {
  const hasHover = hoverSrc && hoverSrc !== primarySrc;

  return (
    <Link href={href} prefetch={false} className="ss-premium-card d-block text-decoration-none">
      <div className="ss-premium-card__img-wrap">
        {/* Primarni image */}
        <StorefrontImage
          sources={[primarySrc]}
          fallbackSrc="/img/odela.jpg"
          width={330}
          height={400}
          alt={title}
          className={`ss-premium-card__img ss-premium-card__img--primary${hasHover ? " ss-premium-card__img--has-hover" : ""}`}
          sizes={sizes}
        />

        {/* Hover image — samo ako postoji drugi */}
        {hasHover ? (
          <StorefrontImage
            sources={[hoverSrc]}
            fallbackSrc="/img/odela.jpg"
            width={330}
            height={400}
            alt={title}
            className="ss-premium-card__img ss-premium-card__img--hover"
            sizes={sizes}
          />
        ) : null}

        {/* Badge */}
        {isNew && !isSale ? (
          <span className="ss-premium-card__badge ss-premium-card__badge--new">Novo</span>
        ) : null}
        {isSale ? (
          <span className="ss-premium-card__badge ss-premium-card__badge--sale">Sale</span>
        ) : null}

        {/* Quick view overlay — pojavljuje se na hover */}
        <div className="ss-premium-card__overlay" aria-hidden="true">
          <span className="ss-premium-card__overlay-label">Pogledaj</span>
        </div>
      </div>

      {/* Info sekcija */}
      <div className="ss-premium-card__info">
        <p className="ss-premium-card__category">{categoryLabel}</p>
        <h6 className="ss-premium-card__title">{title}</h6>
        <div className="ss-premium-card__price">{price}</div>
      </div>
    </Link>
  );
}
