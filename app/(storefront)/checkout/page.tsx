import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import CheckoutPageClient from "@/app/components/storefront/cart/CheckoutPageClient";

export const metadata = {
  title: "Checkout",
  description: "Unos podataka i slanje webshop porudzbine.",
};

export default function CheckoutPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <section className="container" style={{ paddingTop: 160, paddingBottom: 72 }}>
          <CheckoutPageClient />
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}

