"use client";

import { useState } from "react";
import { useStorefrontAuth } from "@/app/components/storefront/StorefrontAuthProvider";
import { isStorefrontAuthConfigured, tryCreateStorefrontBrowserClient } from "@/lib/supabase/storefront-browser";

type Props = {
  isEn: boolean;
  /** Interna putanja nakon uspesnog OAuth (npr. /nalog/porudzbine ili ?next= sa prijave) */
  nextPath: string;
};

const withLangOnPath = (path: string, isEn: boolean) => {
  if (!isEn) return path;
  if (path.includes("lang=")) return path;
  return `${path}${path.includes("?") ? "&" : "?"}lang=en`;
};

export default function StorefrontGoogleSignInButton({ isEn, nextPath }: Props) {
  const { supabase } = useStorefrontAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = async () => {
    setErr(null);
    const client = supabase || tryCreateStorefrontBrowserClient();
    if (!client) {
      setErr(isEn ? "Login is not available." : "Prijava nije dostupna.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      const afterLogin = withLangOnPath(nextPath, isEn);
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(afterLogin)}`;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setBusy(false);
    } catch (e) {
      setErr(String((e as Error)?.message || "OAuth"));
      setBusy(false);
    }
  };

  if (!isStorefrontAuthConfigured()) return null;

  return (
    <div className="mb-4">
      {err ? <div className="alert alert-danger py-2 small mb-2">{err}</div> : null}
      <button
        type="button"
        className="btn btn-light border w-100 d-flex align-items-center justify-content-center gap-2 py-2"
        onClick={() => void handleClick()}
        disabled={busy}
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#FFC107"
            d="M43.611 20.083H42V20H24v8h11.303C33.72 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
          />
          <path
            fill="#FF3D00"
            d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
          />
        </svg>
        <span className="fw-semibold text-uppercase small">
          {busy ? (isEn ? "Redirecting..." : "Preusmeravanje...") : isEn ? "Continue with Google" : "Nastavi sa Google nalogom"}
        </span>
      </button>
      <p className="text-center text-secondary small mt-2 mb-0">
        {isEn ? "Uses the same account as your Google email." : "Koristi isti nalog kao tvoj Google email."}
      </p>
    </div>
  );
}
