import { describe, expect, it } from "vitest";
import { sanitizeStorefrontImageSrc, withStorefrontImageCacheVersion } from "@/lib/storefront/image-utils";

describe("sanitizeStorefrontImageSrc", () => {
  it("keeps legacy fajlovi paths local for cPanel rewrites", () => {
    expect(sanitizeStorefrontImageSrc("/fajlovi/product/Wash1.jpg")).toBe(
      "/fajlovi/product/Wash1.jpg",
    );
  });

  it("rewrites old santos.rs fajlovi URLs to local paths", () => {
    expect(
      sanitizeStorefrontImageSrc("https://santos.rs/fajlovi/product/Wash1.jpg"),
    ).toBe("/fajlovi/product/Wash1.jpg");
  });

  it("rewrites old www.santos.rs fajlovi URLs to local paths", () => {
    expect(
      sanitizeStorefrontImageSrc("https://www.santos.rs/fajlovi/product/Wash1.jpg"),
    ).toBe("/fajlovi/product/Wash1.jpg");
  });

  it("preserves encoded file names and query strings on legacy asset paths", () => {
    expect(
      sanitizeStorefrontImageSrc("https://santos.rs/fajlovi/product/Imeldo%2001.jpg?v=1"),
    ).toBe("/fajlovi/product/Imeldo%2001.jpg?v=1");
  });

  it("leaves feed-facing URLs free of the render-time cache token", () => {
    expect(sanitizeStorefrontImageSrc("/fajlovi/product/074_crop.jpg")).not.toContain("v=2");
  });
});

describe("withStorefrontImageCacheVersion", () => {
  it("stamps a version on an image URL", () => {
    expect(withStorefrontImageCacheVersion("/fajlovi/product/Wash1.jpg")).toBe(
      "/fajlovi/product/Wash1.jpg?v=2",
    );
  });

  it("replaces an older token instead of stacking a second one", () => {
    expect(withStorefrontImageCacheVersion("/fajlovi/product/Imeldo%2001.jpg?v=1")).toBe(
      "/fajlovi/product/Imeldo%2001.jpg?v=2",
    );
  });

  it("keeps other query params", () => {
    expect(withStorefrontImageCacheVersion("/fajlovi/product/a.jpg?w=800&v=1")).toBe(
      "/fajlovi/product/a.jpg?w=800&v=2",
    );
  });

  it("leaves data URIs alone", () => {
    expect(withStorefrontImageCacheVersion("data:image/png;base64,AAA")).toBe(
      "data:image/png;base64,AAA",
    );
  });
});
