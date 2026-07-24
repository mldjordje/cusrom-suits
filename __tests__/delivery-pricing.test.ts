/**
 * The storefront advertised "besplatna dostava preko 15.000 RSD" in the
 * announcement bar, on the product page and in the cart, but no code path ever
 * applied it — checkout charged whatever the courier row said. These functions
 * are the single place that decides, shared by /api/orders and the checkout
 * summary.
 */

import { describe, expect, it } from "vitest";
import {
  applyFreeDeliveryThreshold,
  getRemainingForFreeDelivery,
} from "@/lib/storefront/deliveryPricing";

describe("applyFreeDeliveryThreshold", () => {
  it("charges delivery below the threshold", () => {
    expect(applyFreeDeliveryThreshold(9_900, 450, 15_000)).toBe(450);
  });

  it("waives delivery exactly at the threshold", () => {
    expect(applyFreeDeliveryThreshold(15_000, 450, 15_000)).toBe(0);
  });

  it("waives delivery above the threshold", () => {
    expect(applyFreeDeliveryThreshold(24_900, 450, 15_000)).toBe(0);
  });

  it("treats a threshold of 0 as the offer being switched off", () => {
    expect(applyFreeDeliveryThreshold(100_000, 450, 0)).toBe(450);
  });

  it("never returns a negative cost", () => {
    expect(applyFreeDeliveryThreshold(0, -50, 15_000)).toBe(0);
  });

  it("keeps a zero courier price at zero", () => {
    expect(applyFreeDeliveryThreshold(1_000, 0, 15_000)).toBe(0);
  });
});

describe("getRemainingForFreeDelivery", () => {
  it("reports the shortfall", () => {
    expect(getRemainingForFreeDelivery(9_900, 15_000)).toBe(5_100);
  });

  it("reports zero once the threshold is met", () => {
    expect(getRemainingForFreeDelivery(15_000, 15_000)).toBe(0);
    expect(getRemainingForFreeDelivery(20_000, 15_000)).toBe(0);
  });

  it("reports zero when the offer is switched off", () => {
    expect(getRemainingForFreeDelivery(0, 0)).toBe(0);
  });
});
