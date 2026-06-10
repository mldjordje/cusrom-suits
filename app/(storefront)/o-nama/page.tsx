import Image from "next/image";
import Link from "next/link";
import StorefrontFooter from "@/app/components/storefront/StorefrontFooter";
import StorefrontHeader from "@/app/components/storefront/StorefrontHeader";
import Reveal from "@/app/components/motion/Reveal";
import { getSiteContent } from "@/lib/storefront/siteContent";
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
  const aboutPage = (await getSiteContent()).aboutPage;

  return (
    <>
      <StorefrontHeader lang={lang} />
      <main className="page-wrapper">
        <Reveal as="section" className="position-relative">
          <Image
            src={aboutPage.heroImage}
            width={1920}
            height={900}
            alt={isEn ? aboutPage.heroAltEn : aboutPage.heroAlt}
            className="w-100 h-auto object-fit-cover"
            priority
          />
          <div className="position-absolute top-50 start-50 translate-middle text-center text-white px-3">
            <h1 className="text-uppercase mb-2 text-white">{isEn ? aboutPage.heroTitleEn : aboutPage.heroTitle}</h1>
            <p className="mb-0">{isEn ? aboutPage.heroSubtitleEn : aboutPage.heroSubtitle}</p>
          </div>
        </Reveal>

        <Reveal as="section" className="container py-5" delay={0.06}>
          <div className="row g-4">
            <div className="col-lg-6">
              <h2 className="text-uppercase">{isEn ? aboutPage.introTitleEn : aboutPage.introTitle}</h2>
              {(isEn ? aboutPage.paragraphsEn : aboutPage.paragraphs).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <div className="d-flex gap-2">
                <Link href={aboutPage.primaryCtaHref} className="btn btn-primary text-uppercase fw-medium">
                  {isEn ? aboutPage.primaryCtaLabelEn : aboutPage.primaryCtaLabel}
                </Link>
                <Link href={aboutPage.secondaryCtaHref} className="btn btn-outline-secondary text-uppercase fw-medium">
                  {isEn ? aboutPage.secondaryCtaLabelEn : aboutPage.secondaryCtaLabel}
                </Link>
              </div>
            </div>
            <div className="col-lg-6">
              <Image
                src={aboutPage.secondaryImage}
                width={900}
                height={620}
                alt={isEn ? aboutPage.secondaryImageAltEn : aboutPage.secondaryImageAlt}
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
