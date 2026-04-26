"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function AdminPwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Already running as a standalone PWA?
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } finally {
      setInstalling(false);
    }
  };

  // Already installed — show a subtle indicator
  if (isInstalled) {
    return (
      <span className="admin-pwa-installed" title="Admin app je instalirana">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.4" />
          <path d="M4.5 7.2L6.2 8.8L9.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        App
      </span>
    );
  }

  // Prompt not available (iOS Safari, already installed, etc.) — show nothing
  if (!deferredPrompt) return null;

  return (
    <button
      type="button"
      className="admin-pwa-install-btn"
      onClick={handleInstall}
      disabled={installing}
      title="Instaliraj Admin kao mobilnu aplikaciju"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M7 1v7m0 0L4.5 5.5M7 8l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 10v1.5A0.5 0.5 0 0 0 2.5 12h9a0.5 0.5 0 0 0 0.5-0.5V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      {installing ? "Instalacija..." : "Instaliraj app"}
    </button>
  );
}
