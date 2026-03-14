import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { resolveStorefrontLanguage } from "@/lib/storefront/server-language";

export const metadata = {
  title: "O nama | Santos & Santorini",
  description: "Santos & Santorini - prica brenda, krojenje i kvalitet.",
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lang = await resolveStorefrontLanguage(await searchParams);
  const isEn = lang === "en";
  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="position-relative">
          <Image
            src="/img/hero.jpg"
            width={1920}
            height={900}
            alt="Santos & Santorini hero"
            className="w-100 h-auto object-fit-cover"
            priority
          />
          <div className="position-absolute top-50 start-50 translate-middle text-center text-white px-3">
            <h1 className="text-uppercase mb-2">{isEn ? "About us" : "O nama"}</h1>
            <p className="mb-0">Santos & Santorini atelier, Nis</p>
          </div>
        </Reveal>

        <Reveal as="section" className="container py-5" delay={0.06}>
          <div className="row g-4">
            <div className="col-lg-6">
              <h2 className="text-uppercase">Santos & Santorini</h2>
              <p>
                {isEn
                  ? "The brand is dedicated to elegant menswear, contemporary cuts and carefully selected materials. The focus is on balancing classic appearance with modern comfort."
                  : "Brend je posvećen elegantnom muškom stilu, savremenim krojevima i pažljivo odabranim materijalima. Fokus je na balansu između klasičnog izgleda i modernog komfora."}
              </p>
              <p>
                {isEn
                  ? "The web shop includes ready-to-wear pieces, selected sale offers and blog content following collections, style and brand news."
                  : "U okviru web shop ponude dostupni su ready-to-wear artikli, izdvojene akcije i blog sadržaj koji prati kolekcije, stil i novosti iz brenda."}
              </p>
              <div className="d-flex gap-2">
                <Link href="/web-shop" className="btn btn-primary text-uppercase fw-medium">
                  Web Shop
                </Link>
                <Link href="/kontakt" className="btn btn-outline-secondary text-uppercase fw-medium">
                  {isEn ? "Contact" : "Kontakt"}
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <Image
                src="/img/hero2.jpg"
                width={900}
                height={620}
                alt="Atelier visual"
                className="w-100 h-auto"
              />
            </div>
          </div>
        </Reveal>
      </main>
      <StorefrontFooter lang={lang} />
    </>
  );
}
