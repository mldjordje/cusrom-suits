"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_ACCEPTED, CONSENT_REJECTED, CONSENT_STORAGE_KEY } from "@/lib/analytics/config";
import { CONSENT_CHANGE_EVENT } from "@/app/components/analytics/AnalyticsScripts";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked
    }
  }, []);

  // Both answers are recorded. Previously "Zatvori" also stored consent, so a
  // visitor who declined was counted as having accepted — with Consent Mode
  // reading this key that would have been a real compliance problem.
  const decide = (value: typeof CONSENT_ACCEPTED | typeof CONSENT_REJECTED) => () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
      window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Obavestenje o kolacicima"
      className="ss-cookie-consent"
    >
      <p className="ss-cookie-consent__text">
        Koristimo kolacice kako bismo poboljsali vase iskustvo na sajtu i analizirali posete.{" "}
        <Link href="/polisa_privatnosti" className="ss-cookie-consent__link">
          Saznajte vise
        </Link>
        .
      </p>
      <div className="ss-cookie-consent__actions">
        <button
          type="button"
          onClick={decide(CONSENT_ACCEPTED)}
          className="ss-cookie-consent__button ss-cookie-consent__button--primary"
        >
          Prihvatam
        </button>
        <button
          type="button"
          onClick={decide(CONSENT_REJECTED)}
          className="ss-cookie-consent__button ss-cookie-consent__button--ghost"
        >
          Odbijam
        </button>
      </div>
    </div>
  );
}
