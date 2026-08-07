import "server-only";
import {
  getAnalyticsDateRange,
  type AnalyticsRangeDays,
} from "@/lib/analytics/vercelRange";

export {
  ANALYTICS_RANGE_OPTIONS,
  parseAnalyticsRange,
} from "@/lib/analytics/vercelRange";
export type { AnalyticsRangeDays } from "@/lib/analytics/vercelRange";

const VERCEL_ANALYTICS_API = "https://api.vercel.com/v1/query/web-analytics";
const DEFAULT_PROJECT_ID = "prj_crq927SuHnBrnvUDkGC4M7hbpQQG";
const DEFAULT_TEAM_ID = "team_sCxBo8y4wNxyvBSKIdanPGoz";

type AnalyticsRow = Record<string, string | number | null | undefined>;

export type AnalyticsBreakdownItem = {
  key: string;
  pageviews: number;
  visitors: number;
};

export type AnalyticsEventItem = {
  key: string;
  count: number;
  visitors: number;
};

export type AnalyticsTrendItem = {
  date: string;
  pageviews: number;
  visitors: number;
};

export type VercelAnalyticsReport = {
  status: "connected" | "unconfigured" | "error";
  generatedAt: string;
  range: {
    days: AnalyticsRangeDays;
    since: string;
    until: string;
  };
  totals: {
    pageviews: number;
    visitors: number;
    events: number;
  };
  previousTotals: {
    pageviews: number;
    visitors: number;
    events: number;
  };
  trend: AnalyticsTrendItem[];
  pages: AnalyticsBreakdownItem[];
  referrers: AnalyticsBreakdownItem[];
  countries: AnalyticsBreakdownItem[];
  devices: AnalyticsBreakdownItem[];
  browsers: AnalyticsBreakdownItem[];
  operatingSystems: AnalyticsBreakdownItem[];
  campaigns: AnalyticsBreakdownItem[];
  events: AnalyticsEventItem[];
  errors: string[];
  projectId: string;
  teamId: string;
  tokenConfigured: boolean;
};

type ApiResult = {
  data?: AnalyticsRow | AnalyticsRow[];
};

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getConfig = () => ({
  token:
    process.env.VERCEL_ANALYTICS_TOKEN?.trim() ||
    process.env.VERCEL_API_TOKEN?.trim() ||
    process.env.VERCEL_TOKEN?.trim() ||
    "",
  projectId: process.env.VERCEL_PROJECT_ID?.trim() || DEFAULT_PROJECT_ID,
  teamId: process.env.VERCEL_ORG_ID?.trim() || DEFAULT_TEAM_ID,
});

const emptyReport = (
  days: AnalyticsRangeDays,
  status: VercelAnalyticsReport["status"],
  errors: string[] = [],
): VercelAnalyticsReport => {
  const { since, until } = getAnalyticsDateRange(days);
  const config = getConfig();
  return {
    status,
    generatedAt: new Date().toISOString(),
    range: { days, since, until },
    totals: { pageviews: 0, visitors: 0, events: 0 },
    previousTotals: { pageviews: 0, visitors: 0, events: 0 },
    trend: [],
    pages: [],
    referrers: [],
    countries: [],
    devices: [],
    browsers: [],
    operatingSystems: [],
    campaigns: [],
    events: [],
    errors,
    projectId: config.projectId,
    teamId: config.teamId,
    tokenConfigured: Boolean(config.token),
  };
};

const queryAnalytics = async (
  path: "visits/count" | "visits/aggregate" | "events/count" | "events/aggregate",
  params: Record<string, string | number | undefined>,
  token: string,
  projectId: string,
  teamId: string,
): Promise<ApiResult> => {
  const url = new URL(`${VERCEL_ANALYTICS_API}/${path}`);
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("teamId", teamId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    const payload = (await response.json().catch(() => ({}))) as ApiResult & {
      error?: { message?: string };
      message?: string;
    };

    if (!response.ok) {
      const detail = payload.error?.message || payload.message || response.statusText;
      throw new Error(`${response.status}: ${detail}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const getRows = (result?: ApiResult): AnalyticsRow[] =>
  Array.isArray(result?.data) ? result.data : [];

const getTotals = (result?: ApiResult) => {
  const data = result?.data && !Array.isArray(result.data) ? result.data : {};
  return {
    pageviews: numberValue(data.pageviews),
    visitors: numberValue(data.visitors),
    events: numberValue(data.count ?? data.events),
  };
};

const getBreakdown = (
  result: ApiResult | undefined,
  dimension: string,
): AnalyticsBreakdownItem[] =>
  getRows(result)
    .map((row) => ({
      key: String(row[dimension] || "Direktan / nepoznat"),
      pageviews: numberValue(row.pageviews),
      visitors: numberValue(row.visitors),
    }))
    .filter((item) => item.pageviews > 0 || item.visitors > 0);

const getEvents = (result?: ApiResult): AnalyticsEventItem[] =>
  getRows(result)
    .map((row) => ({
      key: String(row.eventName || "Nepoznat event"),
      count: numberValue(row.count ?? row.events),
      visitors: numberValue(row.visitors),
    }))
    .filter((item) => item.count > 0 || item.visitors > 0);

const getTrend = (result?: ApiResult): AnalyticsTrendItem[] =>
  getRows(result)
    .map((row) => ({
      date: String(row.day || row.date || ""),
      pageviews: numberValue(row.pageviews),
      visitors: numberValue(row.visitors),
    }))
    .filter((item) => item.date)
    .sort((a, b) => a.date.localeCompare(b.date));

export async function getVercelAnalyticsReport(
  days: AnalyticsRangeDays,
): Promise<VercelAnalyticsReport> {
  const config = getConfig();
  if (!config.token) {
    return emptyReport(days, "unconfigured", [
      "Nedostaje VERCEL_ANALYTICS_TOKEN u serverskim environment varijablama.",
    ]);
  }

  const { since, until, previousSince } = getAnalyticsDateRange(days);
  const common = { since, until };
  const previous = { since: previousSince, until: since };
  const query = (
    path: Parameters<typeof queryAnalytics>[0],
    params: Record<string, string | number | undefined>,
  ) => queryAnalytics(path, params, config.token, config.projectId, config.teamId);

  const requests = {
    totals: query("visits/count", common),
    previousTotals: query("visits/count", previous),
    trend: query("visits/aggregate", { ...common, by: "day", limit: days }),
    pages: query("visits/aggregate", { ...common, by: "requestPath", limit: 10 }),
    referrers: query("visits/aggregate", { ...common, by: "referrerHostname", limit: 10 }),
    countries: query("visits/aggregate", { ...common, by: "country", limit: 10 }),
    devices: query("visits/aggregate", { ...common, by: "deviceType", limit: 10 }),
    browsers: query("visits/aggregate", { ...common, by: "browserName", limit: 10 }),
    operatingSystems: query("visits/aggregate", { ...common, by: "osName", limit: 10 }),
    campaigns: query("visits/aggregate", { ...common, by: "utmCampaign", limit: 10 }),
    eventTotals: query("events/count", common),
    previousEventTotals: query("events/count", previous),
    events: query("events/aggregate", { ...common, by: "eventName", limit: 20 }),
  };

  const entries = Object.entries(requests);
  const settled = await Promise.allSettled(entries.map(([, request]) => request));
  const results: Record<string, ApiResult | undefined> = {};
  const errors: string[] = [];

  settled.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") {
      results[key] = result.value;
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(`${key}: ${message}`);
    }
  });

  const totals = getTotals(results.totals);
  const previousTotals = getTotals(results.previousTotals);
  totals.events = getTotals(results.eventTotals).events;
  previousTotals.events = getTotals(results.previousEventTotals).events;

  return {
    status: results.totals ? "connected" : "error",
    generatedAt: new Date().toISOString(),
    range: { days, since, until },
    totals,
    previousTotals,
    trend: getTrend(results.trend),
    pages: getBreakdown(results.pages, "requestPath"),
    referrers: getBreakdown(results.referrers, "referrerHostname"),
    countries: getBreakdown(results.countries, "country"),
    devices: getBreakdown(results.devices, "deviceType"),
    browsers: getBreakdown(results.browsers, "browserName"),
    operatingSystems: getBreakdown(results.operatingSystems, "osName"),
    campaigns: getBreakdown(results.campaigns, "utmCampaign"),
    events: getEvents(results.events),
    errors,
    projectId: config.projectId,
    teamId: config.teamId,
    tokenConfigured: true,
  };
}
