import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import {
  buildUniformProducts,
  resolveUniformImages,
  resolveUniformVideos,
} from "@/lib/storefront/uniforms";

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
  const images = resolveUniformImages(landingSettings);
  const videos = resolveUniformVideos(landingSettings);
  const products = buildUniformProducts(images, tx, isEn);
  const galleryImages = images.map((item) => ({ title: item.title, alt: item.alt, src: item.image }));
  const withLang = (href: string) => {
    if (!isEn || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const heroImage = images[0]?.image || "/img/hero2.jpg";

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-uniform-page">
        {/* HERO */}
        <section className="ss-uniform-hero">
          <div className="ss-uniform-hero__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={tx(landingSettings.uniformsTitle, "Business Uniforms")} loading="eager" decoding="async" />
            <div className="ss-uniform-hero__scrim" />
          </div>
          <div className="container ss-uniform-hero__inner">
            <Reveal as="div" className="ss-uniform-hero__content" delay={0.02} amount={0.2} y={18}>
              <p className="ss-uniform-hero__eyebrow">{tx(landingSettings.uniformsEyebrow, "Business Uniforms")}</p>
              <h1 className="ss-uniform-hero__title">{tx(landingSettings.uniformsTitle, "Business Uniforms")}</h1>
              <p className="ss-uniform-hero__lead">{tx(landingSettings.uniformsText)}</p>
              <div className="d-flex flex-wrap gap-2 mt-4">
                <a href="#uniforme-upit" className="btn btn-primary text-uppercase fw-medium">
                  {isEn ? "Send inquiry" : "Posalji upit"}
                </a>
                <Link href={withLang("/dokumenta")} className="btn btn-light text-uppercase fw-medium">
                  {isEn ? "Documents" : "Dokumenta"}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="container py-5">
          {/* MODELS GRID */}
          <Reveal as="section" className="pb-2" delay={0.02} amount={0.1} y={14}>
            <div className="ss-uniform-section-head">
              <div>
                <p className="ss-uniform-eyebrow">{isEn ? "Uniform collection" : "Kolekcija uniformi"}</p>
                <h2 className="ss-uniform-section-title mb-0">{isEn ? "Models" : "Modeli"}</h2>
              </div>
              <span className="ss-uniform-count">
                {products.length ? `${products.length} ${isEn ? "models" : "modela"}` : ""}
              </span>
            </div>

            {products.length ? (
              <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3 g-md-4">
                {products.map((product) => (
                  <div key={product.slug} className="col">
                    <Link
                      href={withLang(`/poslovne-uniforme/${product.slug}`)}
                      prefetch={false}
                      className="ss-uniform-tile"
                    >
                      <span className="ss-uniform-tile__media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.cover} alt={product.title} loading="lazy" decoding="async" />
                        <span className="ss-uniform-tile__cta">{isEn ? "View" : "Pogledaj"}</span>
                      </span>
                      <span className="ss-uniform-tile__body">
                        <span className="ss-uniform-tile__kicker">{isEn ? "Uniform" : "Uniforma"}</span>
                        <span className="ss-uniform-tile__title">{product.title}</span>
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ss-uniform-empty">
                <p className="mb-0">
                  {isEn ? "Uniform models will be available soon." : "Modeli uniformi ce uskoro biti dostupni."}
                </p>
              </div>
            )}
          </Reveal>

          {/* VIDEO */}
          {videos.length ? (
            <Reveal as="section" className="pt-5" delay={0.03} amount={0.08} y={16}>
              <div className="ss-uniform-section-head">
                <div>
                  <p className="ss-uniform-eyebrow">{isEn ? "Video presentation" : "Video prezentacija"}</p>
                  <h2 className="ss-uniform-section-title mb-0">{isEn ? "Uniforms in motion" : "Uniforme u pokretu"}</h2>
                </div>
              </div>
              <div className="row g-4">
                {videos.map((item, index) => (
                  <div key={`video-${item.video}-${index}`} className="col-12 col-md-6 col-xl-4">
                    <div className="ss-uniform-video-card">
                      <video
                        src={item.video}
                        poster={item.poster || undefined}
                        controls
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-100 h-auto"
                        style={{ borderRadius: 12, objectFit: "cover", background: "#0f172a", aspectRatio: "3 / 4" }}
                      />
                      {item.title ? <h3 className="ss-uniform-video-card__title">{tx(item.title)}</h3> : null}
                      {item.alt ? <p className="ss-uniform-video-card__copy">{tx(item.alt)}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          {/* LOOKBOOK */}
          {galleryImages.length ? (
            <Reveal as="section" className="pt-5" delay={0.04} amount={0.08} y={16}>
              <div className="ss-uniform-section-head">
                <div>
                  <p className="ss-uniform-eyebrow">{isEn ? "Gallery" : "Galerija"}</p>
                  <h2 className="ss-uniform-section-title mb-0">Lookbook</h2>
                </div>
              </div>
              <div className="row g-3 g-md-4">
                {galleryImages.map((item, index) => (
                  <div key={`gallery-${item.src}-${index}`} className="col-6 col-md-4">
                    <div className="ss-uniform-shot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.src}
                        alt={item.alt || tx(item.title || landingSettings.uniformsTitle, "Business Uniforms")}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          {/* INQUIRY */}
          <Reveal as="section" id="uniforme-upit" className="ss-uniform-inquiry mt-5" delay={0.06} amount={0.12} y={16}>
            <p className="ss-uniform-eyebrow">{isEn ? "Inquiry" : "Upit"}</p>
            <h2 className="ss-uniform-section-title mb-3">{isEn ? "Business uniforms" : "Poslovne uniforme"}</h2>
            <p className="ss-uniform-lead mb-4">
              {isEn
                ? "Send team size, activity type and timeline. We will reply with the next steps."
                : "Posaljite opis potreba, broj ljudi, delatnost i okvirni rok. Tim ce vam odgovoriti sa sledecim koracima."}
            </p>
            <form action="/api/contact" method="post" className="row g-3">
              <div className="col-md-6">
                <input name="name" required className="form-control" placeholder={isEn ? "Full name" : "Ime i prezime"} />
              </div>
              <div className="col-md-6">
                <input name="email" type="email" required className="form-control" placeholder="Email" />
              </div>
              <div className="col-md-6">
                <input name="phone" className="form-control" placeholder={isEn ? "Phone" : "Telefon"} />
              </div>
              <div className="col-md-6">
                <input name="company" className="form-control" placeholder={isEn ? "Company name" : "Naziv firme"} />
              </div>
              <div className="col-12">
                <input
                  name="subject"
                  className="form-control"
                  defaultValue={isEn ? "Business uniforms inquiry" : "Upit za poslovne uniforme"}
                />
              </div>
              <div className="col-12">
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="form-control"
                  placeholder={isEn ? "Describe your needs" : "Poruka - opis potreba"}
                />
              </div>
              <input type="hidden" name="source" value="business-uniforms" />
              <div className="col-12">
                <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                  {isEn ? "Send inquiry" : "Posalji upit"}
                </button>
              </div>
            </form>
          </Reveal>
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
