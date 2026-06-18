import { describe, expect, it } from "vitest";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_VIDEO_ACCEPT,
  buildAdminCommercePatch,
  buildProductVideoStoragePath,
  persistUploadedProductVideo,
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

  it("does not overwrite mOffice stock or price from a stale admin draft", () => {
    expect(
      buildAdminCommercePatch({
        isMoffice: true,
        priceOverride: false,
        priceGross: 0,
        priceFinalGross: 0,
        rebatePercent: 0,
        stockWarehouse1: 0,
        stockTotal: 0,
      }),
    ).toEqual({ priceOverride: false });
  });

  it("keeps manual price overrides explicit without overriding mOffice stock", () => {
    expect(
      buildAdminCommercePatch({
        isMoffice: true,
        priceOverride: true,
        priceGross: 2000,
        priceFinalGross: 1790,
        rebatePercent: 10.5,
        stockWarehouse1: 0,
        stockTotal: 0,
      }),
    ).toEqual({
      priceOverride: true,
      priceGross: 2000,
      priceFinalGross: 1790,
      rebatePercent: 10.5,
    });
  });

  it("persists an uploaded video immediately for the edited product", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = async (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await persistUploadedProductVideo(13456699, "https://cdn.test/product.mp4", fetcher);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe("/api/admin/webshop/products");
    expect(requests[0].init?.method).toBe("PATCH");
    expect(JSON.parse(String(requests[0].init?.body))).toEqual({
      legacyId: 13456699,
      videoUrl: "https://cdn.test/product.mp4",
    });
  });

});
