import { describe, expect, it } from "vitest";

import { filterSolidFabrics, isSolidFabric } from "../app/custom-suits/utils/fabricFilter";

describe("custom suits public fabric filter", () => {
  it("keeps explicitly solid and unpatterned fabrics", () => {
    expect(isSolidFabric({ name: "Plava vunena", pattern: "solid" })).toBe(true);
    expect(isSolidFabric({ name: "Tamnozelena vunena", texture: "/fabrics/green.jpg" })).toBe(true);
  });

  it("rejects stripes and checks across metadata, names, and texture paths", () => {
    expect(isSolidFabric({ name: "Navy pinstripe", pattern: "solid" })).toBe(false);
    expect(isSolidFabric({ name: "Plava", pattern: "windowpane" })).toBe(false);
    expect(isSolidFabric({ name: "Siva", texture: "/uploads/karo-siva.jpg" })).toBe(false);
  });

  it("rejects unknown explicit pattern values instead of treating them as solid", () => {
    expect(isSolidFabric({ name: "Plava", pattern: "micro-design" })).toBe(false);
  });

  it("filters a mixed CMS response down to solids only", () => {
    const fabrics = [
      { id: "solid", name: "Plava vunena" },
      { id: "stripe", name: "Plava prugasta" },
      { id: "check", pattern: "glen check" },
    ];

    expect(filterSolidFabrics(fabrics).map((fabric) => fabric.id)).toEqual(["solid"]);
  });
});
