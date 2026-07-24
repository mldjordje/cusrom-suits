import { describe, expect, it } from "vitest";
import {
  buildGoogleMerchantXml,
  buildMetaCatalogCsv,
  stripHtmlForFeed,
  type FeedProduct,
} from "@/lib/catalog/productFeed";

const feedProduct = (overrides: Partial<FeedProduct> = {}): FeedProduct => ({
  legacyId: 133342,
  sku: "133342",
  title: "Karlo Hc/1",
  description: "Trodelno krem musko odelo",
  link: "https://www.santos.rs/web-shop/133342",
  imageLink: "https://www.santos.rs/fajlovi/product/173.jpg",
  additionalImageLinks: ["https://www.santos.rs/fajlovi/product/306.jpg"],
  price: 24_900,
  salePrice: null,
  currency: "RSD",
  availability: "in_stock",
  brand: "Santos & Santorini",
  productType: "Odela",
  condition: "new",
  itemGroupId: "133342",
  ...overrides,
});

describe("buildGoogleMerchantXml", () => {
  it("emits one item per product with the required fields", () => {
    const xml = buildGoogleMerchantXml([feedProduct()], "Santos & Santorini");

    expect(xml).toContain("<g:id>133342</g:id>");
    expect(xml).toContain("<title>Karlo Hc/1</title>");
    expect(xml).toContain("<g:price>24900.00 RSD</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:item_group_id>133342</g:item_group_id>");
  });

  it("omits sale_price when the product is not discounted", () => {
    const xml = buildGoogleMerchantXml([feedProduct()], "Santos");
    expect(xml).not.toContain("<g:sale_price>");
  });

  it("emits price as the reference and sale_price as the current price", () => {
    const xml = buildGoogleMerchantXml(
      [feedProduct({ price: 29_900, salePrice: 24_900 })],
      "Santos",
    );

    expect(xml).toContain("<g:price>29900.00 RSD</g:price>");
    expect(xml).toContain("<g:sale_price>24900.00 RSD</g:sale_price>");
  });

  it("escapes XML metacharacters in product data", () => {
    const xml = buildGoogleMerchantXml(
      [feedProduct({ title: 'Sako "Slim" & <b>novo</b>' })],
      "Santos & Santorini",
    );

    expect(xml).toContain("Sako &quot;Slim&quot; &amp; &lt;b&gt;novo&lt;/b&gt;");
    expect(xml).not.toContain("<b>novo</b>");
  });

  it("renders every additional image", () => {
    const xml = buildGoogleMerchantXml(
      [feedProduct({ additionalImageLinks: ["https://x/1.jpg", "https://x/2.jpg"] })],
      "Santos",
    );

    expect(xml.match(/<g:additional_image_link>/g)).toHaveLength(2);
  });

  it("produces a valid empty channel for an empty catalog", () => {
    const xml = buildGoogleMerchantXml([], "Santos");

    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).not.toContain("<item>");
  });
});

describe("buildMetaCatalogCsv", () => {
  it("writes a header row plus one row per product", () => {
    const csv = buildMetaCatalogCsv([feedProduct(), feedProduct({ legacyId: 2 })]);
    const lines = csv.split("\n");

    expect(lines[0]).toContain("id,title,description");
    expect(lines).toHaveLength(3);
  });

  it("quotes fields and escapes embedded quotes", () => {
    const csv = buildMetaCatalogCsv([feedProduct({ title: 'Sako "Slim"' })]);

    expect(csv).toContain('"Sako ""Slim"""');
  });

  it("joins additional images into one comma-separated column", () => {
    const csv = buildMetaCatalogCsv([
      feedProduct({ additionalImageLinks: ["https://x/1.jpg", "https://x/2.jpg"] }),
    ]);

    expect(csv).toContain('"https://x/1.jpg,https://x/2.jpg"');
  });

  it("leaves sale_price empty when there is no discount", () => {
    const csv = buildMetaCatalogCsv([feedProduct()]);
    const row = csv.split("\n")[1];

    expect(row).toContain('"24900.00 RSD",""');
  });
});

describe("stripHtmlForFeed", () => {
  it("removes markup", () => {
    expect(stripHtmlForFeed("<p>Odelo <b>slim</b></p>")).toBe("Odelo slim");
  });

  it("decodes entities so the XML writer does not double-escape them", () => {
    // Legacy descriptions arrive pre-encoded; leaving &amp; alone would ship
    // &amp;amp; to Merchant Center.
    expect(stripHtmlForFeed("Santos &amp; Santorini")).toBe("Santos & Santorini");
    expect(stripHtmlForFeed("5 &lt; 10 &gt; 2")).toBe("5 < 10 > 2");
    expect(stripHtmlForFeed("&quot;Slim&quot;")).toBe('"Slim"');
  });

  it("decodes numeric entities", () => {
    expect(stripHtmlForFeed("caf&#233;")).toBe("café");
  });

  it("collapses whitespace", () => {
    expect(stripHtmlForFeed("a\n\n  b&nbsp;&nbsp;c")).toBe("a b c");
  });

  it("survives a round trip through the XML writer without double-escaping", () => {
    const xml = buildGoogleMerchantXml(
      [feedProduct({ description: stripHtmlForFeed("Santos &amp; Santorini") })],
      "Santos",
    );

    expect(xml).toContain("<description>Santos &amp; Santorini</description>");
    expect(xml).not.toContain("&amp;amp;");
  });
});
