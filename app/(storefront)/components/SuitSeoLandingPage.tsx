import Link from "next/link";
import JsonLd from "@/app/components/seo/JsonLd";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";
import { listCatalogProducts } from "@/lib/catalog/store";
import { getCatalogProductCategoryLabel } from "@/lib/catalog/presentation";
import { getCatalogProductImageSources, getLocalizedCatalogProductName } from "@/lib/storefront/product-details";
import { buildBreadcrumbJsonLd, absoluteUrl } from "@/lib/seo";

type SuitSeoLandingPageProps = {
  path: string;
  title: string;
  eyebrow: string;
  lead: string;
  introTitle: string;
  introCopy: string;
  localNote: string;
  faq: Array<{ question: string; answer: string }>;
};

const formatRsd = (value: number) =>
  new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency: "RSD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export default async function SuitSeoLandingPage({
  path,
  title,
  eyebrow,
  lead,
  introTitle,
  introCopy,
  localNote,
  faq,
}: SuitSeoLandingPageProps) {
  const catalog = await listCatalogProducts({
    page: 1,
    pageSize: 8,
    categoryGroup: "odelo",
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireDirectImages: true,
    sort: "featured",
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Pocetna", path: "/" },
    { name: title, path },
  ]);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    url: absoluteUrl(path),
    description: lead,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: catalog.items.slice(0, 6).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: getLocalizedCatalogProductName(item, "sr"),
        url: absoluteUrl(`/web-shop/${item.legacyId}`),
      })),
    },
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={faqJsonLd} />
      <JsonLd data={collectionJsonLd} />
      <StorefrontHeader lang="sr" variant="contrast" />
      <main className="page-wrapper">
        <section className="container py-5">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-6">
              <p className="text-uppercase mb-2" style={{ letterSpacing: "0.16em", fontSize: "0.75rem", color: "#ab3331" }}>
                {eyebrow}
              </p>
              <h1 className="section-title text-uppercase mb-3">{title}</h1>
              <p className="text-secondary fs-5 mb-4">{lead}</p>
              <div className="d-flex flex-wrap gap-2">
                <Link href="/web-shop?categoryGroup=odelo" className="btn btn-dark text-uppercase fw-medium">
                  Pogledaj odela
                </Link>
                <Link href="/kontakt" className="btn btn-outline-dark text-uppercase fw-medium">
                  Pitaj za preporuku
                </Link>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="overflow-hidden border bg-white" style={{ borderRadius: 18 }}>
                <StorefrontImage
                  sources={["/img/odela2.jpg", "/img/hero2.jpg"]}
                  width={760}
                  height={560}
                  alt={title}
                  className="w-100 h-auto"
                  sizes="(max-width: 991px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="container pb-5">
          <div className="row g-4">
            <div className="col-12 col-lg-5">
              <h2 className="h3 text-uppercase">{introTitle}</h2>
            </div>
            <div className="col-12 col-lg-7">
              <p className="text-secondary">{introCopy}</p>
              <p className="text-secondary mb-0">{localNote}</p>
            </div>
          </div>
        </section>

        {catalog.items.length ? (
          <section className="container pb-5">
            <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
              <div>
                <p className="text-uppercase mb-2" style={{ letterSpacing: "0.14em", fontSize: "0.72rem", color: "#ab3331" }}>
                  Santos izbor
                </p>
                <h2 className="h3 text-uppercase mb-0">Izdvojena muska odela</h2>
              </div>
              <Link href="/web-shop?categoryGroup=odelo" className="btn-link default-underline text-uppercase fw-medium">
                Sva odela
              </Link>
            </div>
            <div className="row row-cols-2 row-cols-lg-4 g-3 g-md-4">
              {catalog.items.map((item) => {
                const image = getCatalogProductImageSources(item, [], ["/img/odela2.jpg"])[0];
                const name = getLocalizedCatalogProductName(item, "sr");
                return (
                  <article key={item.legacyId} className="col">
                    <Link href={`/web-shop/${item.legacyId}`} className="d-block text-decoration-none text-dark">
                      <StorefrontImage
                        sources={[image]}
                        width={330}
                        height={400}
                        alt={name}
                        className="w-100 h-auto"
                        sizes="(max-width: 575px) 50vw, 25vw"
                      />
                      <p className="mt-3 mb-1 text-uppercase text-secondary small">
                        {getCatalogProductCategoryLabel(item, "sr")}
                      </p>
                      <h3 className="h6 mb-1">{name}</h3>
                      {item.priceFinalGross > 0 ? <p className="mb-0">{formatRsd(item.priceFinalGross)}</p> : null}
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="container pb-5">
          <div className="border bg-white p-4 p-md-5" style={{ borderRadius: 18 }}>
            <h2 className="h3 text-uppercase mb-4">Najcesca pitanja</h2>
            <div className="d-grid gap-2">
              {faq.map((item) => (
                <details key={item.question} className="ss-product-faq-item">
                  <summary>{item.question}</summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <StorefrontFooter lang="sr" />
    </>
  );
}
