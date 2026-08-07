import { Suspense, type ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AnalyticsScripts from "@/app/components/analytics/AnalyticsScripts";
import StorefrontAuthProvider from "@/app/components/storefront/StorefrontAuthProvider";
import StorefrontCartProvider from "@/app/components/storefront/cart/StorefrontCartProvider";
import StorefrontRuntimeShell from "@/app/components/storefront/StorefrontRuntimeShell";
import CookieConsent from "@/app/components/storefront/CookieConsent";
import PromoPopups from "@/app/components/storefront/PromoPopups";
import { getPopupSettings } from "@/lib/marketing/popupSettings";
import { getFontLibrary } from "@/lib/storefront/fontLibrary";
import { getFontSettings } from "@/lib/storefront/fontSettings";
import { buildGoogleFontUrls, buildStorefrontFontCss, resolveFontSettings } from "@/lib/storefront/fontSettingsDefaults";
import "./storefront-base.scss";
import "./storefront-webshop.scss";
import "./santos-theme.scss";

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
      <div className="ss-storefront-font-scope">
        <StorefrontAuthProvider>
          <StorefrontCartProvider>
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
          </StorefrontCartProvider>
        </StorefrontAuthProvider>
      </div>
    </>
  );
}
