import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import ProfileForm from "@/app/components/storefront/account/ProfileForm";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = {
  ...buildSeoMetadata({
    title: "Moj profil",
    description: "Podaci za dostavu sacuvani na nalogu Santos & Santorini.",
    path: "/nalog/profil",
    noIndex: true,
  }),
};

export default async function NalogProfilPage({
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
            <p className="ss-commerce-intro__eyebrow">{isEn ? "Account" : "Nalog"}</p>
            <h1 className="ss-commerce-intro__title">{isEn ? "Your profile" : "Tvoj profil"}</h1>
            <p className="ss-commerce-intro__copy mb-0">
              {isEn
                ? "Fill this in once — checkout takes it from here."
                : "Popuni jednom — naplata dalje radi sama."}
            </p>
          </div>
          <ProfileForm lang={lang} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
