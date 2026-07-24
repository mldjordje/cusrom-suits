"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONSENT_ACCEPTED,
  CONSENT_STORAGE_KEY,
  getGaMeasurementId,
  getMetaPixelId,
  normalizeConsent,
  type ConsentState,
} from "@/lib/analytics/config";

export const CONSENT_CHANGE_EVENT = "ss-consent-change";

const readConsent = (): ConsentState => {
  try {
    return normalizeConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null;
  }
};

/**
 * Loads GA4 and the Meta Pixel behind Consent Mode v2.
 *
 * The scripts mount as soon as an id is configured — GA4 needs to be present to
 * receive the `denied` default, otherwise consent signals are lost. Storage and
 * ad-personalisation stay denied until the visitor accepts the cookie banner,
 * which dispatches CONSENT_CHANGE_EVENT.
 */
export default function AnalyticsScripts() {
  const gaId = getGaMeasurementId();
  const pixelId = getMetaPixelId();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<ConsentState>(null);

  useEffect(() => {
    setConsent(readConsent());
    const sync = () => setConsent(readConsent());
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Push the visitor's decision into Consent Mode whenever it changes.
  useEffect(() => {
    if (!gaId || typeof window.gtag !== "function") return;
    const granted = consent === CONSENT_ACCEPTED;
    window.gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: granted ? "granted" : "denied",
    });
  }, [consent, gaId]);

  // Next.js App Router does client-side navigation, so page_view has to be sent
  // manually on every route change.
  useEffect(() => {
    if (!gaId || typeof window.gtag !== "function") return;
    const query = searchParams?.toString();
    window.gtag("event", "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [gaId, pathname, searchParams]);

  useEffect(() => {
    if (!pixelId || typeof window.fbq !== "function") return;
    window.fbq("track", "PageView");
  }, [pixelId, pathname, searchParams]);

  if (!gaId && !pixelId) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script
            id="ga4-consent-default"
            strategy="afterInteractive"
            // Consent defaults must run before gtag.js loads, otherwise the first
            // hit is sent with implicit consent.
            dangerouslySetInnerHTML={{
              __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('consent','default',{
  ad_storage:'denied',
  ad_user_data:'denied',
  ad_personalization:'denied',
  analytics_storage:'denied',
  wait_for_update: 500
});
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false });
`,
            }}
          />
          <Script
            id="ga4-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
        </>
      ) : null}

      {pixelId ? (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
`,
          }}
        />
      ) : null}
    </>
  );
}
