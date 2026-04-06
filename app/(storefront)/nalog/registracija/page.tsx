import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import SignupForm from "@/app/(storefront)/nalog/registracija/SignupForm";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = {
  ...buildSeoMetadata({
    title: "Registracija",
    description: "Registracija korisnickog naloga Santos & Santorini.",
    path: "/nalog/registracija",
    noIndex: true,
  }),
};

export default async function NalogRegistracijaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-commerce-page">
        <section className="container ss-commerce-shell py-4 py-md-5">
          <div className="ss-commerce-intro mb-4">
            <p className="ss-commerce-intro__eyebrow">{isEn ? "Customer" : "Kupac"}</p>
            <h1 className="ss-commerce-intro__title">{isEn ? "Create your account" : "Otvori svoj nalog"}</h1>
            <p className="ss-commerce-intro__copy mb-0">
              {isEn
                ? "After signing up you can track web shop orders placed with the same email while logged in."
                : "Posle registracije mozes da pratis web shop porudzbine koje posaljes ulogovan istim emailom."}
            </p>
          </div>
          <SignupForm lang={lang} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
