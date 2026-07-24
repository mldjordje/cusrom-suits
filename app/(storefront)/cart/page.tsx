import type { Metadata } from "next";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import CartPageClient from "@/app/components/storefront/cart/CartPageClient";
import { getFulfillmentSettings } from "@/lib/storefront/fulfillment";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata: Metadata = {
  title: "Korpa",
  description: "Pregled odabranih proizvoda i nastavak slanja porudzbine.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [lang, fulfillment] = await Promise.all([
    resolveStorefrontLanguage(await searchParams),
    getFulfillmentSettings(),
  ]);
  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-commerce-page">
        <section className="container ss-commerce-shell">
          <CartPageClient lang={lang} freeDeliveryThreshold={fulfillment.freeDeliveryThreshold} />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
