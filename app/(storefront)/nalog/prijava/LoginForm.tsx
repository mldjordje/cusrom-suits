"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import { isStorefrontAuthConfigured, tryCreateStorefrontBrowserClient } from "@/lib/supabase/storefront-browser";
import type { StorefrontLanguage } from "@/lib/storefront/language";

const safeNextPath = (raw: string | null) => {
  const next = String(raw || "").trim();
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/api/")) return "/nalog/porudzbine";
  return next;
};

export default function LoginForm({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, supabase } = useStorefrontAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLang = (href: string) => {
    if (!isEn) return href;
    if (href.includes("?")) return `${href}&lang=en`;
    return `${href}?lang=en`;
  };

  const nextPath = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (authLoading || !user) return;
    const href =
      isEn && !nextPath.includes("lang=")
        ? `${nextPath}${nextPath.includes("?") ? "&" : "?"}lang=en`
        : nextPath;
    router.replace(href);
  }, [authLoading, user, router, nextPath, isEn]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const client = supabase || tryCreateStorefrontBrowserClient();
    if (!client) {
      setError(isEn ? "Customer login is not configured." : "Prijava kupaca nije podesena.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: signError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message || (isEn ? "Login failed." : "Prijava nije uspela."));
        return;
      }
      router.refresh();
      router.replace(withLang(nextPath));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStorefrontAuthConfigured()) {
    return (
      <div className="ss-order-state-card">
        <p className="ss-order-state-card__eyebrow">{isEn ? "Unavailable" : "Nedostupno"}</p>
        <h1>{isEn ? "Customer accounts are not configured" : "Korisnicki nalozi nisu podeseni"}</h1>
        <p className="mb-0">
          {isEn
            ? "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and enable Email auth in Supabase."
            : "Dodaj NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_ANON_KEY, i ukljuci Email auth u Supabase konzoli."}
        </p>
      </div>
    );
  }

  if (authLoading) {
    return <p className="text-secondary">{isEn ? "Loading..." : "Ucitavanje..."}</p>;
  }

  if (user) {
    return <p className="text-secondary">{isEn ? "Redirecting..." : "Preusmeravanje..."}</p>;
  }

  return (
    <div className="ss-order-panel ss-order-panel--form">
      <div className="ss-order-panel__header">
        <div>
          <p className="ss-order-panel__eyebrow">{isEn ? "Account" : "Nalog"}</p>
          <h2>{isEn ? "Sign in" : "Prijava"}</h2>
        </div>
        <Link href={withLang("/nalog/registracija")} className="btn btn-outline-dark text-uppercase fw-medium">
          {isEn ? "Sign up" : "Registracija"}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="ss-order-form-section">
        {error ? <div className="alert alert-danger py-2 small mb-3">{error}</div> : null}
        <div className="mb-3">
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="form-control"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="login-password" className="form-label">
            {isEn ? "Password" : "Lozinka"}
          </label>
          <input
            id="login-password"
            type="password"
            className="form-control"
            autoComplete="current-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="btn btn-primary text-uppercase fw-medium" disabled={submitting}>
          {submitting ? (isEn ? "Signing in..." : "Prijava...") : isEn ? "Sign in" : "Uloguj se"}
        </button>
      </form>
    </div>
  );
}
