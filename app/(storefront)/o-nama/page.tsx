import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";

export const metadata = {
  title: "O nama | Santos & Santorini",
  description: "Santos & Santorini - prica brenda, krojenje i kvalitet.",
};

export default function AboutPage() {
  return (
    <>
      <StorefrontHeader />
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
            <h1 className="text-uppercase mb-2">O nama</h1>
            <p className="mb-0">Santos & Santorini atelier, Nis</p>
          </div>
        </Reveal>

        <Reveal as="section" className="container py-5" delay={0.06}>
          <div className="row g-4">
            <div className="col-lg-6">
              <h2 className="text-uppercase">Santos & Santorini</h2>
              <p>
                Brend je posvecen elegantnom muskom stilu, savremenim krojevima i pazljivo odabranim materijalima.
                Fokus je na balansu izmedju klasicnog izgleda i modernog komfora.
              </p>
              <p>
                U okviru web shop ponude dostupni su ready-to-wear artikli, izdvojene akcije i blog sadrzaj koji prati
                kolekcije, stil i novosti iz brenda.
              </p>
              <div className="d-flex gap-2">
                <Link href="/web-shop" className="btn btn-primary text-uppercase fw-medium">
                  Web Shop
                </Link>
                <Link href="/kontakt" className="btn btn-outline-secondary text-uppercase fw-medium">
                  Kontakt
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
      <StorefrontFooter />
    </>
  );
}
