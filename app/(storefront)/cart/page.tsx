import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import CartPageClient from "@/app/components/storefront/cart/CartPageClient";

export const metadata = {
  title: "Korpa",
  description: "Pregled odabranih proizvoda i nastavak na checkout.",
};

export default function CartPage() {
  return (
    <>
      <StorefrontHeader />
      <main className="page-wrapper">
        <section className="container" style={{ paddingTop: 160, paddingBottom: 72 }}>
          <CartPageClient />
        </section>
      </main>
      <StorefrontFooter />
    </>
  );
}

