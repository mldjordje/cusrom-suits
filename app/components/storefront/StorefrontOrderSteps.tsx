import Link from "next/link";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type StepKey = "product" | "cart" | "checkout";

export default function StorefrontOrderSteps({
  lang = "sr",
  current,
}: {
  lang?: StorefrontLanguage;
  current: StepKey;
}) {
  const isEn = lang === "en";
  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const steps: Array<{
    key: StepKey;
    label: string;
    href: string;
  }> = [
    {
      key: "product",
      label: isEn ? "Choose product" : "Izaberi proizvod",
      href: withLang("/web-shop"),
    },
    {
      key: "cart",
      label: isEn ? "Review cart" : "Pregledaj korpu",
      href: withLang("/cart"),
    },
    {
      key: "checkout",
      label: isEn ? "Send order" : "Posalji porudzbinu",
      href: withLang("/checkout"),
    },
  ];

  const currentIndex = steps.findIndex((step) => step.key === current);

  return (
    <div className="ss-order-steps">
      {steps.map((step, index) => {
        const isActive = step.key === current;
        const isPast = index < currentIndex;
        const className = `ss-order-step ${isActive ? "is-active" : ""} ${isPast ? "is-past" : ""}`.trim();

        return isActive ? (
          <div key={step.key} className={className} aria-current="step">
            <span className="ss-order-step__label">{step.label}</span>
          </div>
        ) : (
          <Link key={step.key} href={step.href} className={className}>
            <span className="ss-order-step__label">{step.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
