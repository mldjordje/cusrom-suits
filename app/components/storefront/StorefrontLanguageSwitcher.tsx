"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { STOREFRONT_LANGUAGE_COOKIE, type StorefrontLanguage } from "@/lib/storefront/language";

export default function StorefrontLanguageSwitcher({
  lang,
  className,
}: {
  lang: StorefrontLanguage;
  className?: string;
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
    <div className={className ? `d-inline-flex ${className}` : "d-inline-flex"} aria-label="Language switcher">
      <div className="d-inline-flex border rounded-pill overflow-hidden">
        {(["sr", "en"] as StorefrontLanguage[]).map((code) => {
          const active = lang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code)}
              className={`btn btn-sm border-0 rounded-0 px-3 py-1 text-uppercase fw-medium ${active ? "btn-dark text-white" : "btn-link text-decoration-none text-body"}`}
              aria-pressed={active}
            >
              {code}
            </button>
          );
        })}
      </div>
    </div>
  );
}
