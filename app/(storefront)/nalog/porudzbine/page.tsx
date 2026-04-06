import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import OrdersList from "@/app/(storefront)/nalog/porudzbine/OrdersList";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = {
  ...buildSeoMetadata({
    title: "Moje porudzbine",
    description: "Pregled web shop porudzbina na nalogu Santos & Santorini.",
    path: "/nalog/porudzbine",
    noIndex: true,
  }),
};

export default async function NalogPorudzbinePage({
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
            <h1 className="ss-commerce-intro__title">
              {isEn ? "Your orders" : "Tvoje porudzbine"}
            </h1>
            <p className="ss-commerce-intro__copy mb-0">
              {isEn
                ? "Only web shop orders submitted while signed in with the same email are listed here."
                : "Ovde su samo web shop porudzbine poslate dok si ulogovan istim emailom."}
            </p>
          </div>
          <OrdersList lang={lang} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
