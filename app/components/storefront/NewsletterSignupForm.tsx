"use client";

import { useState } from "react";
import type { StorefrontLanguage } from "@/lib/storefront/language";

type SubmitState = "idle" | "success" | "duplicate" | "error";

export default function NewsletterSignupForm({
  lang = "sr",
}: {
  lang?: StorefrontLanguage;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const isEn = lang === "en";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setState("idle");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "storefront-footer",
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setState("error");
        setMessage(json?.message || (isEn ? "Something went wrong. Please try again." : "Došlo je do greške. Pokušajte ponovo."));
        return;
      }

      setState(json.duplicate ? "duplicate" : "success");
      setMessage(json?.message || (isEn ? "You have successfully subscribed." : "Uspešno ste prijavljeni."));
      if (!json.duplicate) {
        setEmail("");
      }
    } catch {
      setState("error");
      setMessage(isEn ? "Something went wrong. Please try again." : "Došlo je do greške. Pokušajte ponovo.");
    } finally {
      setLoading(false);
    }
  };

  const messageClass =
    state === "error"
      ? "text-danger"
      : state === "success" || state === "duplicate"
        ? "text-success"
        : "text-secondary";

  return (
    <form className="footer-newsletter__form position-relative bg-body" onSubmit={handleSubmit}>
      <input
        className="form-control border-white"
        type="email"
        name="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={isEn ? "Your email address" : "Vaša email adresa"}
        autoComplete="email"
        required
      />
      <button
        className="btn-link fw-medium bg-white position-absolute top-0 end-0 h-100 border-0 px-3"
        type="submit"
        disabled={loading}
      >
        {loading ? "..." : isEn ? "SUBMIT" : "POŠALJI"}
      </button>
      {message ? <p className={`mt-2 mb-0 small ${messageClass}`}>{message}</p> : null}
    </form>
  );
}
