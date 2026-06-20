import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("WashCareSymbol", () => {
  it("renders every catalogue render kind through shared data", () => {
    const source = readFileSync(
      join(process.cwd(), "app/components/wash-care/WashCareSymbol.tsx"),
      "utf8",
    );
    expect(source).toContain("getWashCareSymbol(icon).render");
    expect(source).toContain("data-wash-care={icon}");
    for (const kind of ["wash", "bleach", "tumble", "natural", "iron", "professional"]) {
      expect(source).toContain(`spec.kind === \"${kind}\"`);
    }
  });

  it("uses the shared renderer and hides both care surfaces when the selection is empty", () => {
    const source = readFileSync(
      join(process.cwd(), "app/components/storefront/ProductDetailTabs.tsx"),
      "utf8",
    );
    expect(source).toContain('from "@/app/components/wash-care/WashCareSymbol"');
    expect(source).toContain("const hasWashCare = washCare.items.length > 0");
    expect(source.match(/hasWashCare \?/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("provides searchable grouped admin selection with chips and clear-all", () => {
    const source = readFileSync(
      join(process.cwd(), "app/admin/webshop/WashCareSelector.tsx"),
      "utf8",
    );
    expect(source).toContain('placeholder="Pretraži simbole"');
    expect(source).toContain('type="checkbox"');
    expect(source).toContain("WASH_CARE_GROUPS");
    expect(source).toContain("selectedSymbols.map");
    expect(source).toContain("Obriši sve");
    expect(source).toContain("onChange([])");

    const pageSource = readFileSync(join(process.cwd(), "app/admin/webshop/page.tsx"), "utf8");
    expect(pageSource).toContain("<WashCareSelector");
    expect(pageSource).toContain("washCareIcons: draft.washCareIcons,");
  });
});
