import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_VIDEO_ACCEPT,
  buildProductVideoStoragePath,
  validateProductVideoUpload,
} from "@/lib/catalog/productMediaUpload";

describe("product media upload", () => {
  it("uses mobile gallery-compatible accept filters without forcing the camera", () => {
    expect(PRODUCT_IMAGE_ACCEPT).toBe("image/*");
    expect(PRODUCT_VIDEO_ACCEPT).toBe("video/*");
  });

  it("accepts a long iPhone MOV below the direct-upload limit", () => {
    expect(
      validateProductVideoUpload({
        name: "IMG_2256.MOV",
        type: "video/quicktime",
        size: 120 * 1024 * 1024,
      }),
    ).toBeNull();
  });

  it("rejects unsupported files and videos above 250MB", () => {
    expect(validateProductVideoUpload({ name: "notes.pdf", type: "application/pdf", size: 10 })).toMatch(/video/i);
    expect(
      validateProductVideoUpload({ name: "large.mp4", type: "video/mp4", size: 251 * 1024 * 1024 }),
    ).toMatch(/250MB/);
  });

  it("stores optimized videos as MP4 under a safe unique path", () => {
    const path = buildProductVideoStoragePath("Feather Silver / IMG_2256.MOV", "abc-123", new Date("2026-06-18"));
    expect(path).toBe("webshop/videos/2026-06-18/abc-123-feather-silver-img-2256.mp4");
  });

});
