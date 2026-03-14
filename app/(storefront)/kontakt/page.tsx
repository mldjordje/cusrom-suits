import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
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
  const productSubject = productParam ? (isEn ? `Product inquiry #${productParam}` : `Upit za proizvod #${productParam}`) : "";

  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="text-center mb-4">
            <h1 className="text-uppercase">{isEn ? "Contact" : "Kontakt"}</h1>
            <p className="text-secondary mb-0">{isEn ? "Reach out for orders, styling advice and product information." : "Javite nam se za porudžbine, savete i informacije o artiklima."}</p>
          </div>

          {sent ? (
            <div className="alert alert-success mb-4" role="alert">
              {isEn ? "Your message was sent successfully. We will contact you soon." : "Poruka je uspešno poslata. Kontaktiraćemo vas uskoro."}
            </div>
          ) : null}

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="p-4 border rounded-3 h-100 bg-white ss-card-hover">
                <h5 className="text-uppercase mb-3">{isEn ? "Contact details" : "Kontakt podaci"}</h5>
                <p className="mb-2"><strong>{isEn ? "Address" : "Adresa"}:</strong> Obrenoviceva 9, 18000 Nis, Srbija</p>
                <p className="mb-2"><strong>{isEn ? "Phone" : "Telefon"}:</strong> +381 69 445 5106</p>
                <p className="mb-2"><strong>Email:</strong> prodaja@santos.rs</p>
                <p className="mb-0"><strong>{isEn ? "Working hours" : "Radno vreme"}:</strong> {isEn ? "Mon-Fri 09:00-20:00" : "Pon-Pet 09:00-20:00"}</p>
              </div>
            </div>
            <div className="col-lg-7">
              <form action="/api/contact" method="post" className="p-4 border rounded-3 bg-white ss-card-hover">
                <h5 className="text-uppercase mb-3">{isEn ? "Send an inquiry" : "Pošaljite upit"}</h5>
                <div className="row g-3">
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
                    <input name="subject" className="form-control" placeholder={isEn ? "Subject" : "Tema"} defaultValue={productSubject} />
                  </div>
                  <div className="col-12">
                    <textarea name="message" required className="form-control" rows={5} placeholder={isEn ? "Message" : "Poruka"} />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                      {isEn ? "Send" : "Pošalji"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </Reveal>

        <Reveal as="section" className="container pb-5" delay={0.06}>
          <div className="ratio ratio-21x9 border rounded-3 overflow-hidden ss-card-hover">
            <iframe
              src="https://www.google.com/maps?q=43.3201002,21.9037988&z=15&output=embed"
              title="Santos location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
