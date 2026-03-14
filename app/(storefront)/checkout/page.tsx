import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import CheckoutPageClient from "@/app/components/storefront/cart/CheckoutPageClient";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Checkout",
  description: "Unos podataka i slanje webshop porudzbine.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <section className="container" style={{ paddingTop: 160, paddingBottom: 72 }}>
          <CheckoutPageClient lang={lang} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
