import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin font APIs", () => {
  it("requires a viewer with content management permission", () => {
    for (const file of ["app/api/admin/font-settings/route.ts", "app/api/admin/fonts/route.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).toContain("getAdminViewerFromRequest");
      expect(source).toContain('hasAdminPermission(viewer, "content.manage")');
      expect(source).not.toContain("hasAdminToken");
    }
  });

  it("validates WOFF2 files before uploading to site assets", () => {
    const source = readFileSync(join(process.cwd(), "app/api/admin/fonts/route.ts"), "utf8");
    expect(source).toContain("validateWoff2Upload");
    expect(source.lastIndexOf("validateWoff2Upload(")).toBeLessThan(source.lastIndexOf("uploadSiteAsset("));
    expect(source).toContain("addUploadedFontFamily");
  });
});
