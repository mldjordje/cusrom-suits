import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "Loyalty program | Santos & Santorini",
  description: "Prijava za Santos & Santorini loyalty program.",
};

export default async function LoyaltyProgramPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  return (
    <>
      <StorefrontHeader lang={lang} variant="contrast" />
      <main className="page-wrapper">
        <Reveal as="section" className="container py-5">
          <div className="border bg-white p-4 p-md-5 rounded-3 ss-editorial-card">
            <p className="text-uppercase mb-2" style={{ letterSpacing: "0.18em", fontSize: "0.72rem", color: "#ab3331" }}>
              Santos & Santorini
            </p>
            <h1 className="section-title text-uppercase mb-3">Loyalty program</h1>
            <p className="text-secondary mb-0">
              {isEn
                ? "Create an account or sign in to follow orders and join the Santos & Santorini loyalty list."
                : "Napravite nalog ili se prijavite kako biste pratili porudzbine i usli u Santos & Santorini loyalty listu."}
            </p>
            <div className="mt-4 d-flex flex-wrap gap-2">
              <Link href={withLang("/nalog/registracija?source=loyalty")} className="btn btn-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Sign up" : "Prijava za program"}
              </Link>
              <Link href={withLang("/nalog/prijava?source=loyalty")} className="btn btn-outline-dark btn-sm text-uppercase fw-medium">
                {isEn ? "Sign in" : "Login"}
              </Link>
            </div>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
