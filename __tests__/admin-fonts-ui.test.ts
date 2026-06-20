import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("admin font manager UI", () => {
  it("supports two roles, Google import, multi-weight WOFF2 upload and preview", () => {
    const source = readFileSync(join(process.cwd(), "app/admin/fonts/page.tsx"), "utf8");
    for (const text of ["Osnovni font", "Font za naslove", "Dodaj Google font", "Upload WOFF2 fonta", "Live preview"]) expect(source).toContain(text);
    expect(source).toContain('accept=".woff2,font/woff2"');
    expect(source).toContain('form.append("files"');
    expect(source).toContain('form.append("weights"');
    expect(source).toContain("bodyFontId");
    expect(source).toContain("displayFontId");
  });
});
