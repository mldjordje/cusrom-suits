"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ss-cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage blocked
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
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
        <Link href="/politika-privatnosti" className="ss-cookie-consent__link">
          Saznajte vise
        </Link>
        .
      </p>
      <div className="ss-cookie-consent__actions">
        <button
          type="button"
          onClick={accept}
          className="ss-cookie-consent__button ss-cookie-consent__button--primary"
        >
          Prihvatam
        </button>
        <button
          type="button"
          onClick={accept}
          className="ss-cookie-consent__button ss-cookie-consent__button--ghost"
        >
          Zatvori
        </button>
      </div>
    </div>
  );
}
