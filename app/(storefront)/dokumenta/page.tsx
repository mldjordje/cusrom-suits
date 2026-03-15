import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getLandingSettings } from "@/lib/catalog/landingSettings";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Dokumenta | Santos & Santorini",
  description: "Preuzimanje dokumenata i osnovne informacije za kupce.",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const landingSettings = await getLandingSettings();
  const documents = landingSettings.documents.filter((item) => item.title && item.url);
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
          <div className="row g-4">
            <div className="col-12 col-lg-8">
              <div className="border bg-white p-4 p-md-5" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {landingSettings.documentsTitle}
                </p>
                <h1 className="section-title text-uppercase mb-3">
                  {isEn ? "Customer " : "Dokumenta za "}
                  <strong>{isEn ? "documents" : "preuzimanje"}</strong>
                </h1>
                <p className="text-secondary mb-4">{landingSettings.documentsSubtitle}</p>
                <div className="d-grid gap-3">
                  {documents.length > 0 ? (
                    documents.map((item) => (
                      <a
                        key={`${item.title}-${item.url}`}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="border text-decoration-none text-dark px-4 py-3"
                        style={{ borderRadius: 18 }}
                      >
                        <div className="fw-medium">{item.title}</div>
                        {item.description ? <div className="text-secondary small mt-1">{item.description}</div> : null}
                      </a>
                    ))
                  ) : (
                    <div className="border px-4 py-4 text-secondary" style={{ borderRadius: 18 }}>
                      {isEn ? "Documents will be added here soon." : "Dokumenta ce biti dodata ovde cim budu spremna za preuzimanje."}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-4">
              <div className="border bg-white p-4 p-md-5 h-100" style={{ borderRadius: 24 }}>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
                  {isEn ? "Company" : "Firma"}
                </p>
                <div className="d-grid gap-2">
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>PIB</div>
                    <div>{landingSettings.companyPib}</div>
                  </div>
                  <div className="border px-3 py-2" style={{ borderRadius: 14 }}>
                    <div className="text-uppercase fw-medium mb-1" style={{ letterSpacing: "0.12em", fontSize: "0.66rem", color: "#ab3331" }}>MB</div>
                    <div>{landingSettings.companyMb}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="fw-medium mb-2">{landingSettings.customerRightsTitle}</p>
                  <p className="text-secondary small">{landingSettings.customerRightsText}</p>
                </div>
                <div className="mt-3">
                  <p className="fw-medium mb-2">{landingSettings.purchaseGuideTitle}</p>
                  <p className="text-secondary small">{landingSettings.purchaseGuideText}</p>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-4">
                  <Link href={withLang("/web-shop")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Web shop" : "Web shop"}
                  </Link>
                  <Link href={withLang("/kontakt")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                    {isEn ? "Contact" : "Kontakt"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
