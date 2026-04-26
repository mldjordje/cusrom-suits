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

const toUniformSlug = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

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
  const products = images.map((item, index) => {
    const title = tx(item.title || "", isEn ? "Business uniform" : undefined) || (isEn ? "Business uniform" : "Poslovna uniforma");
    const baseSlug = toUniformSlug(item.title || item.alt || `uniform-${index + 1}`) || `uniform-${index + 1}`;
    return {
      slug: `${baseSlug}-${index + 1}`,
      title,
      description: item.alt ? tx(item.alt) : "",
      cover: item.image,
    };
  });
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
        <section className="container py-5">
          <div className="border bg-white p-4 p-md-5 mb-4" style={{ borderRadius: 24 }}>
            <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
              {tx(landingSettings.uniformsEyebrow, "Business Uniforms")}
            </p>
            <h1 className="section-title text-uppercase mb-3">{tx(landingSettings.uniformsTitle, "Business Uniforms")}</h1>
            <p className="text-secondary mb-0">{tx(landingSettings.uniformsText)}</p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <a href="#uniforme-upit" className="btn btn-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Send inquiry" : "Posalji upit"}
              </a>
              <Link href={withLang("/dokumenta")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Documents" : "Dokumenta"}
              </Link>
            </div>
          </div>

          <Reveal as="section" className="pb-4" delay={0.02} amount={0.1} y={14}>
            <div className="d-flex align-items-end justify-content-between gap-3 mb-3">
              <div>
                <p className="text-uppercase mb-1" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "Uniform collection" : "Kolekcija uniformi"}
                </p>
                <h2 className="h3 text-uppercase mb-0">{isEn ? "Business uniforms" : "Poslovne uniforme"}</h2>
              </div>
              <span className="text-secondary small">{products.length ? `${products.length} ${isEn ? "models" : "modela"}` : ""}</span>
            </div>

            {products.length ? (
              <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-2 g-md-3">
                {products.map((product) => (
                  <div key={product.slug} className="product-card-wrapper">
                    <div className="product-card ss-card-hover ss-product-card mb-0">
                      <div className="pc__img-wrapper hover-container">
                        <Link href={withLang(`/poslovne-uniforme/${product.slug}`)} prefetch={false}>
                          <StorefrontSmartImage
                            sources={[product.cover, "/img/hero2.jpg"]}
                            fallbackSrc="/img/hero2.jpg"
                            alt={product.title}
                            width={330}
                            height={400}
                            className="pc__img object-position-top"
                            sizes="(max-width: 767px) 50vw, (max-width: 1199px) 33vw, 25vw"
                            quality={70}
                          />
                        </Link>
                        <Link
                          href={withLang(`/poslovne-uniforme/${product.slug}`)}
                          prefetch={false}
                          className="pc__atc btn anim_appear-bottom btn position-absolute border-0 text-uppercase fw-medium ss-cta-btn d-none d-md-inline-flex"
                        >
                          {isEn ? "Open" : "Otvori"}
                        </Link>
                      </div>
                      <div className="pc__info position-relative">
                        <p className="pc__category">{isEn ? "Uniform" : "Uniforma"}</p>
                        <h6 className="pc__title mb-1">
                          <Link href={withLang(`/poslovne-uniforme/${product.slug}`)} prefetch={false}>
                            {product.title}
                          </Link>
                        </h6>
                        {product.description ? <p className="text-secondary small mb-0">{product.description}</p> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border bg-white p-4" style={{ borderRadius: 24 }}>
                <p className="mb-0 text-secondary">
                  {isEn
                    ? "Uniform models will be available soon."
                    : "Modeli uniformi ce uskoro biti dostupni."}
                </p>
              </div>
            )}
          </Reveal>

          <Reveal as="div" className="row g-4" delay={0.04} amount={0.08} y={16}>
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
          </Reveal>

          <Reveal
            as="div"
            id="uniforme-upit"
            className="border bg-white p-4 p-md-5 mt-5"
            delay={0.06}
            amount={0.12}
            y={16}
          >
            <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
              {isEn ? "Inquiry" : "Upit"}
            </p>
            <h2 className="h4 text-uppercase mb-3">{isEn ? "Business uniforms" : "Poslovne uniforme"}</h2>
            <p className="text-secondary mb-4">
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
