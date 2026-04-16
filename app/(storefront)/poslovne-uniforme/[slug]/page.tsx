import Link from "next/link";
import { notFound } from "next/navigation";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

const toUniformSlug = (value: string) =>
  (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

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
  const images = landingSettings.uniformsImages.filter((item) => item.image);
  const products = images.map((item, index) => {
    const title =
      tx(item.title || "", isEn ? "Business uniform" : undefined) || (isEn ? "Business uniform" : "Poslovna uniforma");
    const baseSlug = toUniformSlug(item.title || item.alt || `uniform-${index + 1}`) || `uniform-${index + 1}`;
    return {
      slug: `${baseSlug}-${index + 1}`,
      title,
      description: item.alt ? tx(item.alt) : "",
      cover: item.image,
    };
  });
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
  const images = landingSettings.uniformsImages.filter((item) => item.image);
  const products = images.map((item, index) => {
    const title =
      tx(item.title || "", isEn ? "Business uniform" : undefined) || (isEn ? "Business uniform" : "Poslovna uniforma");
    const baseSlug = toUniformSlug(item.title || item.alt || `uniform-${index + 1}`) || `uniform-${index + 1}`;
    return {
      slug: `${baseSlug}-${index + 1}`,
      title,
      description: item.alt ? tx(item.alt) : "",
      cover: item.image,
    };
  });
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

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
          <Reveal as="div" delay={0.02} amount={0.1} y={14}>
            <nav className="small mb-3">
              <Link href={withLang("/")} className="text-secondary">
                {isEn ? "Home" : "Pocetna"}
              </Link>
              <span className="text-secondary mx-2">/</span>
              <Link href={withLang("/poslovne-uniforme")} className="text-secondary">
                {isEn ? "Business uniforms" : "Poslovne uniforme"}
              </Link>
            </nav>

            <div className="row g-4 align-items-start">
              <div className="col-lg-7">
                <div className="border bg-white p-3" style={{ borderRadius: 24 }}>
                  <StorefrontSmartImage
                    sources={[product.cover, "/img/hero2.jpg"]}
                    fallbackSrc="/img/hero2.jpg"
                    alt={product.title}
                    width={900}
                    height={1120}
                    className="w-100 h-auto"
                    style={{ borderRadius: 18, objectFit: "cover" }}
                    quality={75}
                  />
                </div>
              </div>
              <div className="col-lg-5">
                <div className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                  <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                    {isEn ? "Uniform" : "Uniforma"}
                  </p>
                  <h1 className="h2 text-uppercase mb-3">{product.title}</h1>
                  {product.description ? <p className="text-secondary mb-4">{product.description}</p> : null}

                  <div className="d-flex flex-wrap gap-2">
                    <a href="#upit" className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? "Send inquiry" : "Posalji upit"}
                    </a>
                    <Link href={withLang("/poslovne-uniforme")} className="btn btn-outline-dark text-uppercase fw-medium">
                      {isEn ? "Back" : "Nazad"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal as="section" id="upit" className="border bg-white p-4 p-md-5 mt-5" delay={0.06} amount={0.12} y={16}>
            <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
              {isEn ? "Inquiry" : "Upit"}
            </p>
            <h2 className="h4 text-uppercase mb-3">{isEn ? "Send inquiry" : "Posalji upit"}</h2>
            <p className="text-secondary mb-4">
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

