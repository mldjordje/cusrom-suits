"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  STOREFRONT_LANGUAGE_COOKIE,
  type StorefrontLanguage,
} from "@/lib/storefront/language";

export default function StorefrontLanguageSwitcher({
  lang,
  className,
  compact = false,
}: {
  lang: StorefrontLanguage;
  className?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setLanguage = (nextLang: StorefrontLanguage) => {
    document.cookie = `${STOREFRONT_LANGUAGE_COOKIE}=${nextLang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (nextLang === "en") {
      params.set("lang", "en");
    } else {
      params.delete("lang");
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl);
    router.refresh();
  };

  return (
    <div
      className={className ? `d-inline-flex ${className}` : "d-inline-flex"}
      aria-label="Language switcher"
    >
      <div className={`ss-lang-switch ${compact ? "ss-lang-switch--compact" : ""}`}>
        {(["sr", "en"] as StorefrontLanguage[]).map((code) => {
          const active = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={`ss-lang-switch__button ${active ? "is-active" : ""}`}
              aria-pressed={active}
            >
              {code.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
