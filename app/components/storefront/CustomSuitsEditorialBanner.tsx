import Link from "next/link";
import Image from "next/image";
import type { StorefrontLanguage } from "@/lib/storefront/language";
import { localizeDynamicStorefrontText } from "@/lib/storefront/dynamicCopy";

type Props = {
  lang?: StorefrontLanguage;
  backgroundImage?: string;
};

export default function CustomSuitsEditorialBanner({ lang = "sr", backgroundImage }: Props) {
  const tx = (sr: string, en: string) => localizeDynamicStorefrontText(sr, lang, en);
  const withLang = (href: string) =>
    lang === "en" ? `${href}?lang=en` : href;

  const bgSrc = backgroundImage || "/img/hero.jpg";

  return (
    <section className="ss-editorial-banner" data-m-tailoring-story="">
      {/* Pozadinska slika */}
      <div className="ss-editorial-banner__media" aria-hidden="true">
        <Image
          src={bgSrc}
          alt=""
          fill
          sizes="100vw"
          className="ss-editorial-banner__img"
          priority={false}
        />
        <div className="ss-editorial-banner__img-overlay" />
      </div>

      {/* Sadržaj */}
      <div className="container ss-editorial-banner__body">
        <div className="ss-editorial-banner__inner" data-m-tailoring-copy="">
          <p className="ss-editorial-banner__eyebrow">
            {tx("Santos & Santorini", "Santos & Santorini")}
          </p>
          <span className="ss-editorial-banner__gold-line" aria-hidden="true" />
          <h2 className="ss-editorial-banner__heading">
            {tx("Odelo po meri", "Made for you")}
          </h2>
          <p className="ss-editorial-banner__sub">
            {tx(
              "Svaki kroj prilagođen tački. Vaš stil, vaše mere, vaš potpis.",
              "Every cut tailored to perfection. Your style, your fit, your signature.",
            )}
          </p>
          <div className="ss-editorial-banner__cta-row">
            <Link href={withLang("/custom-suits")} className="ss-editorial-banner__cta">
              {tx("Konfiguriši odelo", "Configure your suit")}
            </Link>
            <Link href={withLang("/poslovne-uniforme")} className="ss-editorial-banner__cta ss-editorial-banner__cta--ghost">
              {tx("Poslovne uniforme", "Business uniforms")}
            </Link>
          </div>
          <ol className="ss-editorial-banner__steps" aria-label={tx("Proces izrade", "Tailoring process")}>
            <li data-m-tailoring-step="" className="is-active">
              <span>01</span>{tx("Izbor tkanine", "Choose the cloth")}
            </li>
            <li data-m-tailoring-step="">
              <span>02</span>{tx("Kroj po vašoj meri", "Cut to your measure")}
            </li>
            <li data-m-tailoring-step="">
              <span>03</span>{tx("Završni potpis", "The final signature")}
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
