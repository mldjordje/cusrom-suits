import type { StorefrontLanguage } from "@/lib/storefront/language";
import type { SiteAnnouncementsContent } from "@/lib/storefront/siteContent";

type Props = {
  lang?: StorefrontLanguage;
  content?: SiteAnnouncementsContent | null;
};

const FALLBACK_SR = [
  "Besplatna dostava u celoj Srbiji za porudzbine preko 15.000 RSD",
  "Pravo na povracaj 14 dana",
  "Dve prodavnice: Nis i Krusevac",
];
const FALLBACK_EN = [
  "Free delivery across Serbia on orders over 15.000 RSD",
  "Return within 14 days",
  "Two stores: Nis and Krusevac",
];

export default function StorefrontAnnouncementBar({ lang = "sr", content }: Props) {
  const isEn = lang === "en";

  if (content && content.enabled === false) return null;

  const configured = content
    ? isEn
      ? content.itemsEn?.length
        ? content.itemsEn
        : content.items
      : content.items
    : isEn
    ? FALLBACK_EN
    : FALLBACK_SR;

  const items = (configured || []).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!items.length) return null;

  return (
    <div
      aria-label={isEn ? "Site announcement" : "Obavestenje"}
      style={{
        backgroundColor: "#0f0f0f",
        color: "#f5f3ee",
        fontSize: "12px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "8px 16px",
        textAlign: "center",
        lineHeight: 1.4,
        position: "relative",
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "0 20px",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {items.map((text, index) => (
          <span
            key={`${index}-${text}`}
            style={{
              whiteSpace: "nowrap",
              flexShrink: index === 0 ? 1 : 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {index > 0 ? (
              <span
                aria-hidden
                style={{ opacity: 0.35, marginRight: "20px", display: "inline-block" }}
              >
                &bull;
              </span>
            ) : null}
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
