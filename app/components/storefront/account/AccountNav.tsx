"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import { readStorefrontProfile } from "@/lib/storefront/accountProfile";

type Props = {
  isEn: boolean;
  /** Adds `?lang=en` where the page needs it — same rule as the rest of the storefront. */
  withLang: (href: string) => string;
};

const TABS: Array<{ href: string; label: [string, string] }> = [
  { href: "/nalog", label: ["Pregled", "Overview"] },
  { href: "/nalog/porudzbine", label: ["Porudzbine", "Orders"] },
  { href: "/nalog/profil", label: ["Profil", "Profile"] },
];

export default function AccountNav({ isEn, withLang }: Props) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, supabase } = useStorefrontAuth();
  const [signingOut, setSigningOut] = useState(false);

  const profile = readStorefrontProfile(user?.user_metadata);
  const greetingName = profile.fullName.split(" ")[0] || "";

  const handleSignOut = async () => {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.replace(withLang("/nalog/prijava"));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="ss-account-bar">
      <div className="ss-account-bar__identity">
        <p className="ss-account-bar__eyebrow">
          {greetingName
            ? `${isEn ? "Hello" : "Zdravo"}, ${greetingName}`
            : isEn
              ? "Signed in as"
              : "Ulogovan kao"}
        </p>
        <p className="ss-account-bar__email">{user?.email}</p>
      </div>

      <nav className="ss-account-tabs" aria-label={isEn ? "Account" : "Nalog"}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={withLang(tab.href)}
              className={`ss-account-tab ${isActive ? "is-active" : ""}`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label[isEn ? 1 : 0]}
            </Link>
          );
        })}
        <button
          type="button"
          className="ss-account-tab ss-account-tab--signout"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
        >
          {signingOut ? "..." : isEn ? "Sign out" : "Odjavi se"}
        </button>
      </nav>
    </div>
  );
}
