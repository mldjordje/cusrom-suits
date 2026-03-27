import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getSiteContent } from "@/lib/storefront/siteContent";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Kontakt | Santos & Santorini",
  description: "Kontakt informacije i forma za upit.",
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const lang = await resolveStorefrontLanguage(params);
  const isEn = lang === "en";
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";
  const productParam = Array.isArray(params.product) ? params.product[0] : params.product;
  const productSubject = productParam
    ? isEn
      ? `Product inquiry #${productParam}`
      : `Upit za proizvod #${productParam}`
    : "";
  const siteContent = await getSiteContent();
  const stores = siteContent.stores;
  const primaryStore = stores[0];
  const pageCopy = siteContent.contactPage;

  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="text-center mb-4">
            <h1 className="text-uppercase">{isEn ? pageCopy.titleEn : pageCopy.title}</h1>
            <p className="text-secondary mb-0">
              {isEn ? pageCopy.introEn : pageCopy.intro}
            </p>
          </div>

          {sent ? (
            <div className="alert alert-success mb-4" role="alert">
              {isEn
                ? "Your message was sent successfully. We will contact you soon."
                : "Poruka je uspesno poslata. Kontaktiracemo vas uskoro."}
            </div>
          ) : null}

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="p-4 border rounded-3 h-100 bg-white ss-card-hover">
                <h5 className="text-uppercase mb-3">{isEn ? pageCopy.detailsTitleEn : pageCopy.detailsTitle}</h5>
                <div className="d-grid gap-3">
                  {stores.map((store) => (
                    <div key={store.slug} className="rounded-3 border p-3">
                      <p className="mb-2 fw-semibold">{isEn ? store.titleEn : store.title}</p>
                      <p className="mb-1">
                        <strong>{isEn ? "Address" : "Adresa"}:</strong> {isEn ? store.addressEn : store.address}
                      </p>
                      <p className="mb-1">
                        <strong>{isEn ? "Phone" : "Telefon"}:</strong> {store.phone}
                      </p>
                      {store.landline ? (
                        <p className="mb-1">
                          <strong>{isEn ? "Landline" : "Fiksni"}:</strong> {store.landline}
                        </p>
                      ) : null}
                      <p className="mb-2">
                        <strong>Email:</strong> {store.email}
                      </p>
                      <div className="small text-secondary">
                        {(isEn ? store.hoursEn : store.hours).map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <form action="/api/contact" method="post" className="p-4 border rounded-3 bg-white ss-card-hover">
                <h5 className="text-uppercase mb-3">{isEn ? pageCopy.formTitleEn : pageCopy.formTitle}</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <input
                      name="name"
                      required
                      className="form-control"
                      placeholder={isEn ? "Full name" : "Ime i prezime"}
                    />
                  </div>
                  <div className="col-md-6">
                    <input name="email" type="email" required className="form-control" placeholder="Email" />
                  </div>
                  <div className="col-md-6">
                    <input name="phone" className="form-control" placeholder={isEn ? "Phone" : "Telefon"} />
                  </div>
                  <div className="col-md-6">
                    <input
                      name="subject"
                      className="form-control"
                      placeholder={isEn ? "Subject" : "Tema"}
                      defaultValue={productSubject}
                    />
                  </div>
                  <div className="col-md-6">
                    <select name="preferredStore" className="form-control" defaultValue="">
                      <option value="">{isEn ? pageCopy.preferredStorePlaceholderEn : pageCopy.preferredStorePlaceholder}</option>
                      <option value="online">{isEn ? pageCopy.onlineOptionLabelEn : pageCopy.onlineOptionLabel}</option>
                      {stores.map((store) => (
                        <option key={store.slug} value={store.title}>
                          {isEn ? store.titleEn : store.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <textarea
                      name="message"
                      required
                      className="form-control"
                      rows={5}
                      placeholder={isEn ? "Message" : "Poruka"}
                    />
                  </div>
                  <input type="hidden" name="source" value={productParam ? "product-inquiry" : "kontakt-page"} />
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? pageCopy.submitLabelEn : pageCopy.submitLabel}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </Reveal>

        {primaryStore ? (
          <Reveal as="section" className="container pb-5" delay={0.06}>
            <div className="ratio ratio-21x9 border rounded-3 overflow-hidden ss-card-hover">
              <iframe
                src={primaryStore.mapEmbedUrl}
                title={isEn ? primaryStore.titleEn : primaryStore.title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </Reveal>
        ) : null}
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
