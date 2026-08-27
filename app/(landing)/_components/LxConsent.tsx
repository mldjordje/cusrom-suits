"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_ACCEPTED, CONSENT_REJECTED, CONSENT_STORAGE_KEY } from "@/lib/analytics/config";
import { CONSENT_CHANGE_EVENT } from "@/app/components/analytics/AnalyticsScripts";
import styles from "../landing.module.scss";

const COPY = {
  sr: {
    text: "Koristimo kolačiće za analitiku i poboljšanje iskustva.",
    policy: "Politika kolačića",
    accept: "Prihvatam",
    reject: "Odbijam",
  },
  en: {
    text: "We use cookies for analytics and to improve your experience.",
    policy: "Cookie policy",
    accept: "Accept",
    reject: "Decline",
  },
};

/**
 * Same storage key and change event as the storefront banner, so a decision
 * made here is honoured everywhere. Only the styling is landing-local — the
 * shared component depends on the template stylesheets this page refuses.
 */
export default function LxConsent({ lang }: { lang: "sr" | "en" }) {
  const [visible, setVisible] = useState(false);
  const copy = COPY[lang];

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_STORAGE_KEY)) setVisible(true);
    } catch {
      // storage blocked — stay silent rather than nagging every load
    }
  }, []);

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
    <div className={styles.consent} role="dialog" aria-live="polite">
      <p>
        {copy.text}{" "}
        <Link href="/uslovi_koriscenja_kolacica">{copy.policy}</Link>
      </p>
      <div className={styles.consentActions}>
        <button type="button" onClick={decide(CONSENT_REJECTED)}>
          {copy.reject}
        </button>
        <button type="button" onClick={decide(CONSENT_ACCEPTED)}>
          {copy.accept}
        </button>
      </div>
    </div>
  );
}
