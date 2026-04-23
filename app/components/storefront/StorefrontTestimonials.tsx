import type { SiteTestimonialsContent } from "@/lib/storefront/siteContent";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type Props = {
  lang?: StorefrontLanguage;
  content?: SiteTestimonialsContent | null;
  productSku?: string | null;
  maxItems?: number;
  variant?: "full" | "compact";
};

const StarRow = ({ rating }: { rating: number }) => {
  const safe = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return (
    <span aria-label={`Ocena ${safe} od 5`} className="ss-testimonial__stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i < safe ? "is-on" : "is-off"}>
          {"\u2605"}
        </span>
      ))}
    </span>
  );
};

export default function StorefrontTestimonials({
  lang = "sr",
  content,
  productSku = null,
  maxItems = 3,
  variant = "full",
}: Props) {
  if (!content || content.enabled === false) return null;
  const isEn = lang === "en";
  const all = (content.items || []).filter((t) => t && t.text && t.author);
  if (!all.length) return null;

  const sku = (productSku || "").trim().toUpperCase();
  const productMatches = sku
    ? all.filter((t) => (t.productSku || "").trim().toUpperCase() === sku)
    : [];
  const pool = productMatches.length >= 2 ? productMatches : all;
  const items = pool.slice(0, Math.max(1, maxItems));

  const title = (isEn ? content.titleEn : content.title) || (isEn ? "What our customers say" : "Sta kazu nasi kupci");

  return (
    <section
      className={`ss-testimonials container mt-5 pt-4 ${variant === "compact" ? "ss-testimonials--compact" : ""}`}
      aria-label={title}
    >
      <header className="ss-testimonials__header">
        <p className="ss-testimonials__eyebrow">{isEn ? "Real reviews" : "Prave recenzije"}</p>
        <h2 className="h3 text-uppercase mb-0">{title}</h2>
      </header>
      <div className="ss-testimonials__grid">
        {items.map((t) => {
          const text = (isEn ? t.textEn : t.text) || t.text;
          const location = (isEn ? t.locationEn : t.location) || t.location;
          return (
            <figure key={t.id} className="ss-testimonial">
              <StarRow rating={t.rating} />
              <blockquote className="ss-testimonial__quote">&ldquo;{text}&rdquo;</blockquote>
              <figcaption className="ss-testimonial__author">
                <span className="ss-testimonial__name">{t.author}</span>
                {location ? <span className="ss-testimonial__location">{location}</span> : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}
