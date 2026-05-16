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
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Obaveštenje o kolačićima"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        backgroundColor: "#1a1a1a",
        color: "#f5f3ee",
        padding: "1rem 1.25rem",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.75rem 1.5rem",
        fontSize: "0.8125rem",
        lineHeight: 1.5,
        boxShadow: "0 -2px 16px rgba(0,0,0,0.18)",
      }}
    >
      <p style={{ margin: 0, flex: "1 1 280px" }}>
        Koristimo kolačiće kako bismo poboljšali vaše iskustvo na sajtu i analizirali posete.{" "}
        <Link
          href="/politika-privatnosti"
          style={{ color: "#f5f3ee", textDecoration: "underline" }}
        >
          Saznajte više
        </Link>
        .
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button
          type="button"
          onClick={accept}
          style={{
            padding: "0.5rem 1.25rem",
            backgroundColor: "#fff",
            color: "#1a1a1a",
            border: "none",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Prihvatam
        </button>
        <button
          type="button"
          onClick={accept}
          style={{
            padding: "0.5rem 1.25rem",
            backgroundColor: "transparent",
            color: "#f5f3ee",
            border: "1px solid rgba(245,243,238,0.35)",
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Zatvori
        </button>
      </div>
    </div>
  );
}
