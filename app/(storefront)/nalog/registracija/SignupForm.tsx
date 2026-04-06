"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import { isStorefrontAuthConfigured, tryCreateStorefrontBrowserClient } from "@/lib/supabase/storefront-browser";
import type { StorefrontLanguage } from "@/lib/storefront/language";

export default function SignupForm({ lang }: { lang: StorefrontLanguage }) {
  const isEn = lang === "en";
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useStorefrontAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const withLang = useCallback(
    (href: string) => {
      if (!isEn) return href;
      if (href.includes("?")) return `${href}&lang=en`;
      return `${href}?lang=en`;
    },
    [isEn],
  );

  useEffect(() => {
    if (authLoading || !user) return;
    router.replace(withLang("/nalog/porudzbine"));
  }, [authLoading, user, router, withLang]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const client = supabase || tryCreateStorefrontBrowserClient();
    if (!client) {
      setError(isEn ? "Customer signup is not configured." : "Registracija nije podesena.");
      return;
    }
    setSubmitting(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { data, error: signError } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: origin ? `${origin}/nalog/prijava` : undefined,
        },
      });
      if (signError) {
        setError(signError.message || (isEn ? "Sign up failed." : "Registracija nije uspela."));
        return;
      }
      if (data.session) {
        router.refresh();
        router.replace(withLang("/nalog/porudzbine"));
        return;
      }
      setNotice(
        isEn
          ? "Check your email to confirm the account before signing in."
          : "Proveri email da potvrdis nalog pre prijave.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStorefrontAuthConfigured()) {
    return (
      <div className="ss-order-state-card">
        <p className="ss-order-state-card__eyebrow">{isEn ? "Unavailable" : "Nedostupno"}</p>
        <h1>{isEn ? "Customer accounts are not configured" : "Korisnicki nalozi nisu podeseni"}</h1>
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
          <h2>{isEn ? "Create account" : "Otvori nalog"}</h2>
        </div>
        <Link href={withLang("/nalog/prijava")} className="btn btn-outline-dark text-uppercase fw-medium">
          {isEn ? "Sign in" : "Prijava"}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="ss-order-form-section">
        {error ? <div className="alert alert-danger py-2 small mb-3">{error}</div> : null}
        {notice ? <div className="alert alert-success py-2 small mb-3">{notice}</div> : null}
        <div className="mb-3">
          <label htmlFor="signup-name" className="form-label">
            {isEn ? "Full name" : "Ime i prezime"}
          </label>
          <input
            id="signup-name"
            type="text"
            className="form-control"
            autoComplete="name"
            value={fullName}
            onChange={(ev) => setFullName(ev.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signup-email" className="form-label">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            className="form-control"
            autoComplete="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="signup-password" className="form-label">
            {isEn ? "Password (min. 6 characters)" : "Lozinka (min. 6 karaktera)"}
          </label>
          <input
            id="signup-password"
            type="password"
            className="form-control"
            autoComplete="new-password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={6}
          />
        </div>
        <button type="submit" className="btn btn-primary text-uppercase fw-medium" disabled={submitting}>
          {submitting ? (isEn ? "Creating..." : "Registracija...") : isEn ? "Sign up" : "Registruj se"}
        </button>
      </form>
    </div>
  );
}
