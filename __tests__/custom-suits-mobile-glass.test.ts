import { describe, expect, it } from "vitest";
import {
  MOBILE_GLASS_ACTIVE_CONTROL_CLASS,
  MOBILE_GLASS_PANEL_CLASS,
  MOBILE_GLASS_PRIMARY_ACTION_CLASS,
} from "@/lib/custom-suits/mobileGlass";

describe("custom suits mobile glass controls", () => {
  it("uses a floating translucent glass shell with a safe fallback", () => {
    expect(MOBILE_GLASS_PANEL_CLASS).toContain("rounded-[28px]");
    expect(MOBILE_GLASS_PANEL_CLASS).toContain("backdrop-blur");
    expect(MOBILE_GLASS_PANEL_CLASS).toContain("backdrop-saturate");
    expect(MOBILE_GLASS_PANEL_CLASS).toContain("bg-[#111820]/88");
    expect(MOBILE_GLASS_PANEL_CLASS).toContain("supports-[backdrop-filter]:bg-[#111820]/58");
  });

  it("gives interactive controls distinct glass surfaces", () => {
    expect(MOBILE_GLASS_ACTIVE_CONTROL_CLASS).toContain("bg-white/18");
    expect(MOBILE_GLASS_PRIMARY_ACTION_CLASS).toContain("bg-white/92");
  });
});
