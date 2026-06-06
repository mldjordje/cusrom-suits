import { describe, expect, it } from "vitest";
import {
  FIRST_PUBLIC_ORDER_NUMBER,
  formatPublicOrderNumber,
  getNextPublicOrderNumber,
} from "@/lib/orders/publicOrderNumber";

describe("public order numbers", () => {
  it("starts at 100 when no prior public number exists", () => {
    expect(getNextPublicOrderNumber([])).toBe(FIRST_PUBLIC_ORDER_NUMBER);
    expect(getNextPublicOrderNumber([{ config: {} }, { config: { publicOrderNumber: 12 } }])).toBe(100);
  });

  it("continues from the highest stored public number", () => {
    expect(
      getNextPublicOrderNumber([
        { config: { publicOrderNumber: 100 } },
        { config: { publicOrderNumber: 104 } },
        { config: { publicOrderNumber: 102 } },
      ]),
    ).toBe(105);
  });

  it("formats the public number and falls back to the internal id", () => {
    expect(formatPublicOrderNumber({ id: "abc", config: { publicOrderNumber: 120 } })).toBe("120");
    expect(formatPublicOrderNumber({ id: "abc", config: {} })).toBe("abc");
  });
});
