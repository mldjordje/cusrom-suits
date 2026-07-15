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

  const renderItem = (text: string, index: number, keyPrefix: string) => (
    <span
      key={`${keyPrefix}-${index}-${text}`}
      className="ss-announcement-item"
      style={{
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {index > 0 ? (
        <span aria-hidden style={{ opacity: 0.35, marginRight: "20px", display: "inline-block" }}>
          &bull;
        </span>
      ) : null}
      {text}
    </span>
  );

  return (
    <div
      id="ss-announcement-bar"
      aria-label={isEn ? "Site announcement" : "Obavestenje"}
      style={{
        backgroundColor: "#0f0f0f",
        color: "#f5f3ee",
        fontSize: "12px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "8px 0",
        textAlign: "center",
        lineHeight: 1.4,
        position: "relative",
        zIndex: 40,
        overflow: "hidden",
      }}
    >
      <style>{`
        #ss-announcement-bar .ss-announcement-track-desktop {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
          display: flex;
          flex-wrap: nowrap;
          justify-content: center;
          align-items: center;
          gap: 0 20px;
          overflow: hidden;
          min-width: 0;
        }
        #ss-announcement-bar .ss-announcement-track-desktop .ss-announcement-item {
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        #ss-announcement-bar .ss-announcement-track-desktop .ss-announcement-item:first-child {
          flex-shrink: 1;
        }
        #ss-announcement-bar .ss-announcement-track-desktop .ss-announcement-item:not(:first-child) {
          flex-shrink: 0;
        }
        #ss-announcement-bar .ss-announcement-track-mobile {
          display: none;
        }
        @media (max-width: 767px) {
          #ss-announcement-bar .ss-announcement-track-desktop {
            display: none;
          }
          #ss-announcement-bar .ss-announcement-track-mobile {
            display: flex;
            width: max-content;
            animation: ss-announcement-scroll 18s linear infinite;
          }
          #ss-announcement-bar .ss-announcement-track-mobile .ss-announcement-item {
            padding-right: 40px;
          }
        }
        @media (max-width: 767px) and (prefers-reduced-motion: reduce) {
          #ss-announcement-bar .ss-announcement-track-mobile {
            animation: none;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
        @keyframes ss-announcement-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="ss-announcement-track-desktop">
        {items.map((text, index) => renderItem(text, index, "d"))}
      </div>

      <div className="ss-announcement-track-mobile">
        {items.map((text, index) => renderItem(text, index, "m1"))}
        {items.map((text, index) => renderItem(text, index, "m2"))}
      </div>
    </div>
  );
}
