import { describe, expect, it } from "vitest";
import { buildUploadedFontStoragePath, validateWoff2Upload } from "@/lib/storefront/fontUpload";

const woff2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 0]);

describe("WOFF2 uploads", () => {
  it("accepts a valid WOFF2 file and supported weight", () => {
    expect(validateWoff2Upload({ name: "Brand.woff2", type: "font/woff2", size: 6, bytes: woff2, weight: "400" })).toEqual({ ok: true, weight: "400" });
  });

  it("rejects invalid signature, extension, size and weight", () => {
    expect(validateWoff2Upload({ name: "Brand.woff2", type: "font/woff2", size: 4, bytes: new Uint8Array([0, 1, 2, 3]), weight: "400" }).ok).toBe(false);
    expect(validateWoff2Upload({ name: "Brand.ttf", type: "font/ttf", size: 6, bytes: woff2, weight: "400" }).ok).toBe(false);
    expect(validateWoff2Upload({ name: "Brand.woff2", type: "font/woff2", size: 5 * 1024 * 1024 + 1, bytes: woff2, weight: "400" }).ok).toBe(false);
    expect(validateWoff2Upload({ name: "Brand.woff2", type: "font/woff2", size: 6, bytes: woff2, weight: "900" }).ok).toBe(false);
  });

  it("builds server-controlled storage paths", () => {
    expect(buildUploadedFontStoragePath("Brand Serif!", "700")).toBe("fonts/brand-serif/700.woff2");
  });
});
