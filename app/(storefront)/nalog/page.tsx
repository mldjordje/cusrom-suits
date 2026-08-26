import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import AccountOverview from "@/app/components/storefront/account/AccountOverview";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = {
  ...buildSeoMetadata({
    title: "Moj nalog",
    description: "Pregled naloga, porudzbina i podataka za dostavu.",
    path: "/nalog",
    noIndex: true,
  }),
};

export default async function NalogPage({
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
            <h1 className="ss-commerce-intro__title">{isEn ? "Your account" : "Tvoj nalog"}</h1>
            <p className="ss-commerce-intro__copy mb-0">
              {isEn
                ? "Orders, delivery details and everything checkout should already know about you."
                : "Porudzbine, podaci za dostavu i sve sto naplata vec treba da zna o tebi."}
            </p>
          </div>
          <AccountOverview lang={lang} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
