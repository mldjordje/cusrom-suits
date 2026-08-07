import { describe, expect, it } from "vitest";
import {
  getAnalyticsDateRange,
  parseAnalyticsRange,
} from "@/lib/analytics/vercelRange";

describe("Vercel analytics range", () => {
  it("accepts supported periods and defaults invalid values to 30 days", () => {
    expect(parseAnalyticsRange("7")).toBe(7);
    expect(parseAnalyticsRange(["90"])).toBe(90);
    expect(parseAnalyticsRange("365")).toBe(30);
    expect(parseAnalyticsRange(undefined)).toBe(30);
  });

  it("builds current and previous ranges with the same duration", () => {
    const range = getAnalyticsDateRange(7, new Date("2026-07-26T12:34:56.000Z"));

    expect(range.until).toBe("2026-07-26T12:34:00.000Z");
    expect(range.since).toBe("2026-07-19T12:34:00.000Z");
    expect(range.previousSince).toBe("2026-07-12T12:34:00.000Z");
  });
});
