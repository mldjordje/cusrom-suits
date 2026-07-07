import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin font APIs", () => {
  it("uses the same admin token guard as the webshop CMS endpoints", () => {
    for (const file of ["app/api/admin/font-settings/route.ts", "app/api/admin/fonts/route.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain("hasAdminToken");
      expect(source).not.toContain("getAdminViewerFromRequest");
      expect(source).not.toContain("hasAdminPermission");
    }
  });

  it("validates WOFF2 files before uploading to site assets", () => {
    const source = readFileSync(join(process.cwd(), "app/api/admin/fonts/route.ts"), "utf8");
    expect(source).toContain("validateWoff2Upload");
    expect(source.lastIndexOf("validateWoff2Upload(")).toBeLessThan(source.lastIndexOf("uploadSiteAsset("));
    expect(source).toContain("addUploadedFontFamily");
  });
});
