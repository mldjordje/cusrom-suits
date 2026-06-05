import { describe, expect, it } from "vitest";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";

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
});
