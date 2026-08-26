import { Suspense } from "react";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import LoginForm from "@/app/(storefront)/nalog/prijava/LoginForm";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata = {
  ...buildSeoMetadata({
    title: "Prijava",
    description: "Prijava na korisnicki nalog Santos & Santorini — pregled porudzbina.",
    path: "/nalog/prijava",
    noIndex: true,
  }),
};

export default async function NalogPrijavaPage({
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
            <h1 className="ss-commerce-intro__title">
              {isEn ? "Sign in to see your orders" : "Prijavi se da vidis svoje porudzbine"}
            </h1>
            <p className="ss-commerce-intro__copy mb-0">
              {isEn
                ? "Orders you placed as a guest with this email address are waiting here too."
                : "I porudzbine koje si poslao kao gost sa ove email adrese cekaju te ovde."}
            </p>
          </div>
          <Suspense fallback={<p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>}>
            <LoginForm lang={lang} />
          </Suspense>
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
