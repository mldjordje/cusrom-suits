import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("storefront font activation", () => {
  it("loads font settings only in the storefront layout and emits scoped CSS", () => {
    const storefront = readFileSync(join(process.cwd(), "app/(storefront)/layout.tsx"), "utf8");
    const admin = readFileSync(join(process.cwd(), "app/admin/layout.tsx"), "utf8");
    expect(storefront).toContain("getFontSettings");
    expect(storefront).toContain("getFontLibrary");
    expect(storefront).toContain("buildStorefrontFontCss");
    expect(storefront).toContain('className="ss-storefront-font-scope"');
    expect(admin).not.toContain("ss-storefront-font-scope");
  });
});
