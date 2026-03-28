import Link from "next/link";
import Reveal from "@/app/components/motion/Reveal";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import {
  LEGAL_PAGE_ORDER,
  LEGAL_PAGES,
  type LegalPageSlug,
} from "@/lib/storefront/legalPages";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export function getLegalPageMetadata(slug: LegalPageSlug) {
  const page = LEGAL_PAGES[slug];
  return {
    title: `${page.title} | Santos & Santorini`,
    description: page.description,
  };
}

export default async function LegalPageView({
  slug,
  searchParams,
}: {
  slug: LegalPageSlug;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const page = LEGAL_PAGES[slug];
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const landingSettings = await getLandingSettings();
  const withLang = (href: string) => {
    if (!isEn || !href.startsWith("/")) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };
  const relatedPages = LEGAL_PAGE_ORDER.filter((entry) => entry !== slug).map((entry) => LEGAL_PAGES[entry]);
  const downloadableDocuments = landingSettings.documents.filter((item) => item.title && item.url).slice(0, 4);

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="row g-4">
            <div className="col-12 col-xl-8">
              <div className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                <p
                  className="text-uppercase mb-2"
                  style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
                >
                  {isEn ? page.eyebrowEn : page.eyebrow}
                </p>
                <h1 className="section-title text-uppercase mb-3">
                  <strong>{isEn ? page.titleEn : page.title}</strong>
                </h1>
                <p className="text-secondary mb-4">{isEn ? page.introEn : page.intro}</p>

                <div className="d-grid gap-4">
                  {page.sections.map((section) => (
                    <section
                      key={`${page.slug}-${section.title}`}
                      className="border bg-white px-4 py-4"
                      style={{ borderRadius: 18 }}
                    >
                      <h2 className="h5 text-uppercase mb-3">{isEn ? section.titleEn : section.title}</h2>
                      <div className="d-grid gap-3 text-secondary">
                        {(isEn ? section.paragraphsEn : section.paragraphs).map((paragraph, index) => (
                          <p key={`${page.slug}-${section.title}-${index}`} className="mb-0">
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-12 col-xl-4">
              <div className="d-grid gap-4">
                <aside className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                  <p
                    className="text-uppercase mb-2"
                    style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
                  >
                    {isEn ? "Company" : "Kompanija"}
                  </p>
                  <div className="d-grid gap-2">
                    <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                      <div
                        className="text-uppercase fw-medium mb-1"
                        style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}
                      >
                        PIB
                      </div>
                      <div>{landingSettings.companyPib}</div>
                    </div>
                    <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                      <div
                        className="text-uppercase fw-medium mb-1"
                        style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}
                      >
                        MB
                      </div>
                      <div>{landingSettings.companyMb}</div>
                    </div>
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <Link href={withLang("/kontakt")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                      {isEn ? "Contact" : "Kontakt"}
                    </Link>
                    <Link href={withLang("/checkout")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      Checkout
                    </Link>
                    <Link href={withLang("/dokumenta")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {isEn ? "Documents" : "Dokumenta"}
                    </Link>
                  </div>
                </aside>

                <aside className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                  <p
                    className="text-uppercase mb-2"
                    style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
                  >
                    {isEn ? "More legal pages" : "Jos pravnih stranica"}
                  </p>
                  <div className="d-grid gap-2">
                    {relatedPages.map((related) => (
                      <Link
                        key={related.slug}
                        href={withLang(`/${related.slug}`)}
                        className="border text-decoration-none text-dark px-3 py-3"
                        style={{ borderRadius: 14 }}
                      >
                        <div className="fw-medium">{isEn ? related.titleEn : related.title}</div>
                        <div className="small text-secondary mt-1">
                          {isEn ? related.descriptionEn : related.description}
                        </div>
                      </Link>
                    ))}
                  </div>
                </aside>

                <aside className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                  <p
                    className="text-uppercase mb-2"
                    style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
                  >
                    {isEn ? "Downloads" : "Preuzimanja"}
                  </p>
                  <div className="d-grid gap-2">
                    {downloadableDocuments.length > 0 ? (
                      downloadableDocuments.map((item) => (
                        <a
                          key={`${item.title}-${item.url}`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="border text-decoration-none text-dark px-3 py-3"
                          style={{ borderRadius: 14 }}
                        >
                          <div className="fw-medium">{item.title}</div>
                          {item.description ? <div className="small text-secondary mt-1">{item.description}</div> : null}
                        </a>
                      ))
                    ) : (
                      <div className="border px-3 py-3 text-secondary" style={{ borderRadius: 14 }}>
                        {isEn ? "Documents will be listed here." : "Dokumenta ce biti prikazana ovde."}
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
