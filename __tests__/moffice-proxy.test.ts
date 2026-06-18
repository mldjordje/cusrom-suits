import { describe, expect, it } from "vitest";
import { buildMofficeProxyHeaders } from "@/lib/integrations/moffice/proxy";

describe("mOffice cPanel proxy", () => {
  it("uses the proxy-specific header supported by cPanel", () => {
    expect(buildMofficeProxyHeaders("proxy-secret")).toEqual({
      "X-Proxy-Secret": "proxy-secret",
    });
  });
});
