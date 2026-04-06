import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Poslovne uniforme | Santos & Santorini",
  description: "Poslovne uniforme i galerija modela za kompanije i timove.",
};

export default async function BusinessUniformsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const tx = (value: string, fallbackEn?: string) =>
    localizeDynamicStorefrontText(value, isEn ? "en" : "sr", fallbackEn);
  const landingSettings = await getLandingSettings();
  const images = landingSettings.uniformsImages.filter((item) => item.image);
  const videos = landingSettings.uniformsVideos.filter((item) => item.video);
  const galleryItems = [
    ...images.map((item) => ({ type: "image" as const, title: item.title, alt: item.alt, src: item.image })),
    ...videos.map((item) => ({
      type: "video" as const,
      title: item.title,
      alt: item.alt,
      src: item.video,
      poster: item.poster,
    })),
  ];
  const withLang = (href: string) => {
    if (!isEn || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="border bg-white p-4 p-md-5 mb-4" style={{ borderRadius: 24 }}>
            <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
              {tx(landingSettings.uniformsEyebrow, "Business Uniforms")}
            </p>
            <h1 className="section-title text-uppercase mb-3">{tx(landingSettings.uniformsTitle, "Business Uniforms")}</h1>
            <p className="text-secondary mb-0">{tx(landingSettings.uniformsText)}</p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Link href={withLang("/kontakt")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Contact team" : "Kontaktiraj tim"}
              </Link>
              <Link href={withLang("/dokumenta")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Documents" : "Dokumenta"}
              </Link>
            </div>
          </div>

          <div className="row g-4">
            {galleryItems.map((item, index) => (
              <div key={`${item.type}-${item.src}-${index}`} className="col-12 col-md-6 col-xl-4">
                <div className="border bg-white p-3 h-100" style={{ borderRadius: 24 }}>
                  {item.type === "image" ? (
                    <StorefrontSmartImage
                      sources={[item.src, "/img/hero2.jpg"]}
                      fallbackSrc="/img/hero2.jpg"
                      alt={item.alt || tx(item.title || landingSettings.uniformsTitle, "Business Uniforms")}
                      width={600}
                      height={760}
                      className="w-100 h-auto"
                      style={{ borderRadius: 18, objectFit: "cover" }}
                    />
                  ) : (
                    <video
                      src={item.src}
                      poster={item.poster || undefined}
                      controls
                      preload="metadata"
                      className="w-100 h-auto"
                      style={{ borderRadius: 18, objectFit: "cover", background: "#0f172a" }}
                    />
                  )}
                  {item.title ? <h2 className="h5 text-uppercase mt-3 mb-1">{tx(item.title)}</h2> : null}
                  {item.alt ? <p className="text-secondary mb-0 small">{tx(item.alt)}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
