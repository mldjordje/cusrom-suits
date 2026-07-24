/**
 * Central switchboard for the storefront's marketing tags.
 *
 * Everything is opt-in through env vars so a deployment without them ships zero
 * third-party script tags — which is also what keeps the SaaS story simple later:
 * one tenant's ids never leak into another's build.
 */

export const CONSENT_STORAGE_KEY = "ss-cookie-consent";
export const CONSENT_ACCEPTED = "granted";
export const CONSENT_REJECTED = "denied";

export type ConsentState = typeof CONSENT_ACCEPTED | typeof CONSENT_REJECTED | null;

/**
 * The banner used to store a bare "1" for "accepted". Visitors who clicked
 * accept before Consent Mode existed still carry that value, and the banner
 * won't reappear for them — so keep honouring it.
 */
export const normalizeConsent = (raw: string | null | undefined): ConsentState => {
  if (raw === CONSENT_ACCEPTED || raw === "1") return CONSENT_ACCEPTED;
  if (raw === CONSENT_REJECTED) return CONSENT_REJECTED;
  return null;
};

export const getGaMeasurementId = () =>
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

export const getMetaPixelId = () => process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

export const getAnalyticsCurrency = () =>
  process.env.NEXT_PUBLIC_ANALYTICS_CURRENCY?.trim() || "RSD";

export const isAnalyticsConfigured = () => Boolean(getGaMeasurementId() || getMetaPixelId());
