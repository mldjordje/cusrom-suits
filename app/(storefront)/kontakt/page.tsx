import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";

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
  const sent = (Array.isArray(params.sent) ? params.sent[0] : params.sent) === "1";

  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <section className="container py-5">
          <div className="text-center mb-4">
            <h1 className="text-uppercase">Kontakt</h1>
            <p className="text-secondary mb-0">Javite nam se za porudzbine, savete i custom-suits upite.</p>
          </div>

          {sent ? (
            <div className="alert alert-success mb-4" role="alert">
              Poruka je uspesno poslata. Kontaktiracemo vas uskoro.
            </div>
          ) : null}

          <div className="row g-4">
            <div className="col-lg-5">
              <div className="p-4 border rounded-3 h-100 bg-white">
                <h5 className="text-uppercase mb-3">Kontakt podaci</h5>
                <p className="mb-2"><strong>Adresa:</strong> Obrenoviceva 9, 18000 Nis, Srbija</p>
                <p className="mb-2"><strong>Telefon:</strong> +381 69 445 5106</p>
                <p className="mb-2"><strong>Email:</strong> prodaja@santos.rs</p>
                <p className="mb-0"><strong>Radno vreme:</strong> Pon-Pet 09:00-20:00</p>
              </div>
            </div>
            <div className="col-lg-7">
              <form action="/api/contact" method="post" className="p-4 border rounded-3 bg-white">
                <h5 className="text-uppercase mb-3">Posaljite upit</h5>
                <div className="row g-3">
                  <div className="col-md-6">
                    <input name="name" required className="form-control" placeholder="Ime i prezime" />
                  </div>
                  <div className="col-md-6">
                    <input name="email" type="email" required className="form-control" placeholder="Email" />
                  </div>
                  <div className="col-md-6">
                    <input name="phone" className="form-control" placeholder="Telefon" />
                  </div>
                  <div className="col-md-6">
                    <input name="subject" className="form-control" placeholder="Tema" />
                  </div>
                  <div className="col-12">
                    <textarea name="message" required className="form-control" rows={5} placeholder="Poruka" />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary text-uppercase fw-medium">
                      Posalji
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="container pb-5">
          <div className="ratio ratio-21x9 border rounded-3 overflow-hidden">
            <iframe
              src="https://www.google.com/maps?q=43.3201002,21.9037988&z=15&output=embed"
              title="Santos location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}
