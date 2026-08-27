import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsScripts from "@/app/components/analytics/AnalyticsScripts";
import StorefrontAuthProvider from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontRuntimeShell from "@/app/components/storefront/StorefrontRuntimeShell";
import MotionProvider from "@/app/components/motion/MotionProvider";
import { MOTION_BOOT_SCRIPT } from "@/lib/motion/bootScript";
import CookieConsent from "@/app/components/storefront/CookieConsent";
import PromoPopups from "@/app/components/storefront/PromoPopups";
import { getPopupSettings } from "@/lib/marketing/popupSettings";
import { getFontLibrary } from "@/lib/storefront/fontLibrary";
import { getFontSettings } from "@/lib/storefront/fontSettings";
import { buildGoogleFontUrls, buildStorefrontFontCss, resolveFontSettings } from "@/lib/storefront/fontSettingsDefaults";
import "./storefront-base.scss";
import "./storefront-webshop.scss";
import "./santos-theme.scss";
// Loaded last on purpose — the lux layer restates the design on top of the
// purchased template rather than editing 9k lines of it in place.
import "./santos-lux.scss";
// Last: the motion layer only gates start states and vendors the Lenis
// contract, so it must win over anything the layers above declare.
import "./santos-motion.scss";

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const [popupSettings, fontSettings, fontLibrary] = await Promise.all([
    getPopupSettings(),
    getFontSettings(),
    getFontLibrary(),
  ]);
  const resolvedFonts = resolveFontSettings(fontSettings, fontLibrary);
  const fontCss = buildStorefrontFontCss(resolvedFonts);
  const googleFontUrls = buildGoogleFontUrls(resolvedFonts);
  return (
    <>
      {googleFontUrls.map((href) => <link key={href} rel="stylesheet" href={href} />)}
      <style dangerouslySetInnerHTML={{ __html: fontCss }} />
      {/* Synchronous on purpose — it sets the class that hidden start states
          hang off, and it has to win the race against first paint. */}
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT_SCRIPT }} />
      <div className="ss-storefront-font-scope ss-lux">
        <StorefrontAuthProvider>
          <StorefrontCartProvider>
            <MotionProvider>
              <StorefrontRuntimeShell />
              {children}
              <CookieConsent />
              <PromoPopups settings={popupSettings} />
              {/* useSearchParams inside AnalyticsScripts needs a Suspense boundary
                  so it doesn't opt every storefront route out of static rendering. */}
              <Suspense fallback={null}>
                <AnalyticsScripts />
              </Suspense>
              <Analytics />
              <SpeedInsights />
            </MotionProvider>
          </StorefrontCartProvider>
        </StorefrontAuthProvider>
      </div>
    </>
  );
}
