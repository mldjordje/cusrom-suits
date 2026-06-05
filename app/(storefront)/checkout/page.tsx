import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import CheckoutPageClient from "@/app/components/storefront/cart/CheckoutPageClient";
import { getFulfillmentSettings } from "@/lib/storefront/fulfillment";
import { getSiteContent } from "@/lib/storefront/siteContent";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Porudzbina",
  description: "Unos podataka i slanje webshop porudzbine.",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const [fulfillment, siteContent] = await Promise.all([getFulfillmentSettings(), getSiteContent()]);
  const pickupStores = siteContent.stores.map((store) => ({
    slug: store.slug,
    label: isEn ? store.titleEn : store.title,
    address: isEn ? store.addressEn : store.address,
  }));
  const deliveryServices = fulfillment.deliveryServices
    .filter((service) => service.isActive)
    .map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
    }));

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper ss-commerce-page">
        <section className="container ss-commerce-shell">
          <CheckoutPageClient
            lang={lang}
            pickupStores={pickupStores}
            deliveryServices={deliveryServices}
            fulfillmentCopy={{
              pickupEnabled: fulfillment.pickupEnabled,
              deliveryEnabled: fulfillment.deliveryEnabled,
              pickupLabel: isEn ? fulfillment.pickupLabelEn : fulfillment.pickupLabel,
              deliveryLabel: isEn ? fulfillment.deliveryLabelEn : fulfillment.deliveryLabel,
              pickupNote: isEn ? fulfillment.pickupNoteEn : fulfillment.pickupNote,
              deliveryNote: isEn ? fulfillment.deliveryNoteEn : fulfillment.deliveryNote,
            }}
          />
        </section>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
