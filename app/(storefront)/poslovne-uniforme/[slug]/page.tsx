import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import UniformGallery from "@/app/components/storefront/UniformGallery";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";
import {
  buildUniformProducts,
  resolveUniformImages,
  resolveUniformVideos,
  BUNDLED_UNIFORM_DOCUMENTS,
} from "@/lib/storefront/uniforms";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const tx = (value: string, fallbackEn?: string) =>
    localizeDynamicStorefrontText(value, isEn ? "en" : "sr", fallbackEn);
  const landingSettings = await getLandingSettings();
  const products = buildUniformProducts(resolveUniformImages(landingSettings), tx, isEn);
  const product = products.find((p) => p.slug === slug);

  return buildSeoMetadata({
    title: product?.title || (isEn ? "Business uniform" : "Poslovna uniforma"),
    description:
      product?.description ||
      (isEn ? "Business uniform details and inquiry form." : "Detalji poslovne uniforme i forma za upit."),
    path: `/poslovne-uniforme/${slug}`,
    lang,
    image: product?.cover || "/img/hero2.jpg",
    noIndex: !product,
  });
}

export default async function BusinessUniformDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const tx = (value: string, fallbackEn?: string) =>
    localizeDynamicStorefrontText(value, isEn ? "en" : "sr", fallbackEn);
  const landingSettings = await getLandingSettings();
  const products = buildUniformProducts(resolveUniformImages(landingSettings), tx, isEn);
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const videos = resolveUniformVideos(landingSettings);
  const withLang = (href: string) => {
    if (!isEn || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-uniform-page">
        <section className="container py-5">
          <Reveal as="div" delay={0.02} amount={0.1} y={14}>
            <nav className="ss-uniform-breadcrumb small mb-4">
              <Link href={withLang("/")}>{isEn ? "Home" : "Pocetna"}</Link>
              <span aria-hidden="true">/</span>
              <Link href={withLang("/poslovne-uniforme")}>{isEn ? "Business uniforms" : "Poslovne uniforme"}</Link>
              <span aria-hidden="true">/</span>
              <span className="ss-uniform-breadcrumb__current">{product.title}</span>
            </nav>

            <div className="row g-4 g-lg-5 align-items-start">
              <div className="col-lg-7">
                <div className="ss-uniform-gallery-card">
                  <UniformGallery images={product.gallery} name={product.title} />
                </div>
              </div>
              <div className="col-lg-5">
                <div className="ss-uniform-info-card">
                  <p className="ss-uniform-eyebrow">{isEn ? "Business uniform" : "Poslovna uniforma"}</p>
                  <h1 className="ss-uniform-title">{product.title}</h1>
                  {product.description ? <p className="ss-uniform-lead">{product.description}</p> : null}

                  <ul className="ss-uniform-points">
                    <li>{isEn ? "Made to your brand & dress code" : "Izrada prema brendu i dress code-u"}</li>
                    <li>{isEn ? "Men's & women's combinations" : "Muske i zenske kombinacije"}</li>
                    <li>{isEn ? "Full team capsule collections" : "Kompletne capsule kolekcije za tim"}</li>
                  </ul>

                  <div className="d-flex flex-wrap gap-2 mt-4">
                    <a href="#upit" className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? "Send inquiry" : "Posalji upit"}
                    </a>
                    <Link href={withLang("/poslovne-uniforme")} className="btn btn-outline-dark text-uppercase fw-medium">
                      {isEn ? "Back to collection" : "Nazad na kolekciju"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {videos.length ? (
            <Reveal as="section" className="pt-5" delay={0.05} amount={0.08} y={16}>
              <p className="ss-uniform-eyebrow">{isEn ? "Video presentation" : "Video prezentacija"}</p>
              <h2 className="ss-uniform-section-title mb-4">{isEn ? "Uniforms in motion" : "Uniforme u pokretu"}</h2>
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
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          <Reveal as="section" className="pt-5" delay={0.06} amount={0.08} y={16}>
            <p className="ss-uniform-eyebrow">{isEn ? "Downloads" : "Preuzimanje"}</p>
            <h2 className="ss-uniform-section-title mb-4">{isEn ? "Presentations & catalogues" : "Prezentacije i katalozi"}</h2>
            <div className="d-flex flex-wrap gap-3">
              {BUNDLED_UNIFORM_DOCUMENTS.map((doc) => (
                <a
                  key={doc.file}
                  href={doc.file}
                  download
                  className="btn btn-outline-dark d-inline-flex align-items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {isEn ? doc.titleEn : doc.title}
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal as="section" id="upit" className="ss-uniform-inquiry mt-5" delay={0.06} amount={0.12} y={16}>
            <p className="ss-uniform-eyebrow">{isEn ? "Inquiry" : "Upit"}</p>
            <h2 className="ss-uniform-section-title mb-3">{isEn ? "Send inquiry" : "Posalji upit"}</h2>
            <p className="ss-uniform-lead mb-4">
              {isEn
                ? "Tell us team size, activity type and timeline. We will reply with the next steps."
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
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="form-control"
                  placeholder={isEn ? "Message (describe your needs)" : "Poruka (opis potreba)"}
                />
              </div>
              <input type="hidden" name="source" value="business-uniform-product" />
              <input type="hidden" name="subject" value={`${isEn ? "Business uniforms inquiry" : "Upit za poslovne uniforme"}: ${product.title}`} />
              <input type="hidden" name="uniformSlug" value={product.slug} />
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
