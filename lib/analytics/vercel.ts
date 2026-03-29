import { SITE_URL } from "@/lib/seo";

type AnalyticsEventValue = string | number | boolean | null | undefined;

const DEFAULT_DASHBOARD_URL = "https://vercel.com/dashboard";

export const getVercelAnalyticsDashboardUrl = () =>
  process.env.VERCEL_ANALYTICS_DASHBOARD_URL?.trim() ||
  process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_DASHBOARD_URL?.trim() ||
  DEFAULT_DASHBOARD_URL;

export const getVercelAnalyticsOverview = () => ({
  dashboardUrl: getVercelAnalyticsDashboardUrl(),
  productionUrl: process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || SITE_URL,
  runtime: process.env.VERCEL === "1" ? "vercel" : "local",
  pageviewTrackingEnabled: true,
  customEventsConfigured: true,
});

const sanitizeEventProperties = (properties: Record<string, AnalyticsEventValue>) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

export async function trackVercelServerEvent(
  name: string,
  properties: Record<string, AnalyticsEventValue> = {},
) {
  if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") return;

  try {
    const { track } = await import("@vercel/analytics/server");
    await Promise.resolve(track(name, sanitizeEventProperties(properties)));
  } catch (error) {
    console.error("[vercel-analytics] server track failed", {
      name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
