export const ANALYTICS_RANGE_OPTIONS = [7, 30, 90] as const;
export type AnalyticsRangeDays = (typeof ANALYTICS_RANGE_OPTIONS)[number];

export const parseAnalyticsRange = (value?: string | string[] | null): AnalyticsRangeDays => {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return ANALYTICS_RANGE_OPTIONS.includes(parsed as AnalyticsRangeDays)
    ? (parsed as AnalyticsRangeDays)
    : 30;
};

export const getAnalyticsDateRange = (days: AnalyticsRangeDays, now = new Date()) => {
  const until = new Date(now);
  until.setSeconds(0, 0);
  const since = new Date(until);
  since.setUTCDate(since.getUTCDate() - days);
  const previousSince = new Date(since);
  previousSince.setUTCDate(previousSince.getUTCDate() - days);

  return {
    since: since.toISOString(),
    until: until.toISOString(),
    previousSince: previousSince.toISOString(),
  };
};
