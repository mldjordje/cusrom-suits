import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getSiteContent } from "@/lib/storefront/siteContent";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Prodajna Mesta | Santos & Santorini",
  description: "Adrese, telefoni i radno vreme Santos & Santorini prodajnih mesta.",
};

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const siteContent = await getSiteContent();
  const stores = siteContent.stores;
  const pageCopy = siteContent.storesPage;

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="text-center mb-4">
            <h1 className="text-uppercase">{isEn ? pageCopy.titleEn : pageCopy.title}</h1>
            <p className="text-secondary mb-0">
              {isEn ? pageCopy.introEn : pageCopy.intro}
            </p>
          </div>

          <div className="row g-4">
            {stores.map((store) => (
              <div key={store.slug} className="col-12 col-xl-6">
                <div className="border bg-white p-4 h-100" style={{ borderRadius: 24 }}>
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                    <div>
                      <p
                        className="text-uppercase mb-2"
                        style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}
                      >
                        {isEn ? store.cityEn : store.city}
                      </p>
                      <h2 className="h4 text-uppercase mb-0">{isEn ? store.titleEn : store.title}</h2>
                    </div>
                    <a href={`tel:${store.phone.replace(/\s+/g, "")}`} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                      {isEn ? pageCopy.callCtaLabelEn : pageCopy.callCtaLabel}
                    </a>
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="border rounded-3 p-3 h-100">
                        <p className="fw-semibold mb-2">{isEn ? pageCopy.contactCardTitleEn : pageCopy.contactCardTitle}</p>
                        <p className="mb-1">{isEn ? store.addressEn : store.address}</p>
                        <p className="mb-1">{store.phone}</p>
                        {store.landline ? <p className="mb-1">{store.landline}</p> : null}
                        <a href={`mailto:${store.email}`}>{store.email}</a>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded-3 p-3 h-100">
                        <p className="fw-semibold mb-2">{isEn ? pageCopy.hoursCardTitleEn : pageCopy.hoursCardTitle}</p>
                        <div className="text-secondary">
                          {(isEn ? store.hoursEn : store.hours).map((line) => (
                            <div key={line}>{line}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ratio ratio-16x9 border rounded-3 overflow-hidden mt-4">
                    <iframe
                      src={store.mapEmbedUrl}
                      title={isEn ? store.titleEn : store.title}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
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
