import { getBrokenProductIdSet } from "@/lib/catalog/mediaHealth";
import { listCatalogProducts, type CatalogProductView } from "@/lib/catalog/store";
import { isBusinessUniformProduct } from "@/lib/catalog/productTypes";
import { getCatalogProductImageSources } from "@/lib/storefront/product-details";
import { sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";
import { absoluteUrl } from "@/lib/seo";

/**
 * Shared source for the Google Merchant and Meta catalog feeds.
 *
 * Uses exactly the same filters as /web-shop, so a product advertised in a
 * shopping campaign always resolves to a page that actually renders. Feeds that
 * drift from the storefront get items disapproved for "unavailable" or
 * "mismatched price", which is why this lives in one place.
 */

const FEED_PAGE_SIZE = 120;
const MAX_FEED_PAGES = 40;

export type FeedProduct = {
  legacyId: number;
  sku: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  price: number;
  salePrice: number | null;
  currency: string;
  availability: "in_stock" | "out_of_stock";
  brand: string;
  productType: string;
  condition: "new";
  itemGroupId: string | null;
};

export const getFeedCurrency = () =>
  process.env.NEXT_PUBLIC_ANALYTICS_CURRENCY?.trim() || "RSD";

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/**
 * Legacy descriptions are stored as HTML with entities already encoded. Feeds
 * need plain text: the XML writer re-escapes on the way out (leaving `&amp;`
 * in place would ship `&amp;amp;`), and the CSV must not carry markup at all.
 */
export const stripHtmlForFeed = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();

const toAbsoluteImage = (value: string) => {
  const sanitized = sanitizeStorefrontImageSrc(value);
  if (!sanitized) return "";
  if (sanitized.startsWith("http://") || sanitized.startsWith("https://")) return sanitized;
  if (sanitized.startsWith("data:")) return "";
  return absoluteUrl(sanitized);
};

const toFeedProduct = (item: CatalogProductView): FeedProduct | null => {
  // Uniforms are quote-only — they have no price to advertise.
  if (isBusinessUniformProduct(item)) return null;

  const price = Number(item.priceFinalGross || 0);
  if (!(price > 1)) return null;

  const images = getCatalogProductImageSources(item, [], [])
    .map(toAbsoluteImage)
    .filter((value) => value.length > 0);
  // Merchant Center rejects items without a usable image.
  if (!images.length) return null;

  const grossPrice = Number(item.priceGross || 0);
  const hasDiscount = grossPrice > price;
  const stock = Math.max(Number(item.stockTotal || 0), Number(item.stockWarehouse1 || 0));
  const description = stripHtmlForFeed(item.description || item.specification || item.name).slice(0, 4_500);

  return {
    legacyId: item.legacyId,
    sku: item.sku || String(item.legacyId),
    title: item.name.slice(0, 150),
    description: description || item.name,
    link: absoluteUrl(`/web-shop/${item.legacyId}`),
    imageLink: images[0],
    additionalImageLinks: images.slice(1, 11),
    // Google reads `price` as the reference and `sale_price` as the current one.
    price: hasDiscount ? grossPrice : price,
    salePrice: hasDiscount ? price : null,
    currency: getFeedCurrency(),
    availability: stock > 0 ? "in_stock" : "out_of_stock",
    brand: item.brand || "Santos & Santorini",
    productType: item.categories.map((category) => category.name).join(" > ") || "Muska moda",
    condition: "new",
    // Groups colour/size variants of one model together.
    itemGroupId: item.sku ? String(item.sku) : null,
  };
};

export async function loadFeedProducts(): Promise<FeedProduct[]> {
  const brokenProductIds = await getBrokenProductIdSet();
  const sharedFilters = {
    pageSize: FEED_PAGE_SIZE,
    activeOnly: true,
    exportOnly: true,
    collapseBySku: true,
    requireDirectImages: true,
    excludeLegacyIds: brokenProductIds.size ? Array.from(brokenProductIds) : undefined,
  } as const;

  const firstPage = await listCatalogProducts({ page: 1, ...sharedFilters });
  const totalPages = Math.min(firstPage.totalPages, MAX_FEED_PAGES);
  const remainingPages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
  const rest = await Promise.all(
    remainingPages.map((page) => listCatalogProducts({ page, ...sharedFilters })),
  );

  return [firstPage, ...rest]
    .flatMap((result) => result.items)
    .map(toFeedProduct)
    .filter((item): item is FeedProduct => item !== null);
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatFeedPrice = (value: number, currency: string) => `${value.toFixed(2)} ${currency}`;

export function buildGoogleMerchantXml(products: FeedProduct[], siteName: string): string {
  const items = products
    .map((product) => {
      const additional = product.additionalImageLinks
        .map((image) => `      <g:additional_image_link>${escapeXml(image)}</g:additional_image_link>`)
        .join("\n");

      return [
        "    <item>",
        `      <g:id>${escapeXml(String(product.legacyId))}</g:id>`,
        `      <g:mpn>${escapeXml(product.sku)}</g:mpn>`,
        `      <title>${escapeXml(product.title)}</title>`,
        `      <description>${escapeXml(product.description)}</description>`,
        `      <link>${escapeXml(product.link)}</link>`,
        `      <g:image_link>${escapeXml(product.imageLink)}</g:image_link>`,
        additional,
        `      <g:availability>${product.availability}</g:availability>`,
        `      <g:condition>${product.condition}</g:condition>`,
        `      <g:price>${escapeXml(formatFeedPrice(product.price, product.currency))}</g:price>`,
        product.salePrice != null
          ? `      <g:sale_price>${escapeXml(formatFeedPrice(product.salePrice, product.currency))}</g:sale_price>`
          : "",
        `      <g:brand>${escapeXml(product.brand)}</g:brand>`,
        `      <g:product_type>${escapeXml(product.productType)}</g:product_type>`,
        product.itemGroupId
          ? `      <g:item_group_id>${escapeXml(product.itemGroupId)}</g:item_group_id>`
          : "",
        "    </item>",
      ]
        .filter((line) => line.length > 0)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(absoluteUrl("/"))}</link>
    <description>${escapeXml(`${siteName} — product feed`)}</description>
${items}
  </channel>
</rss>
`;
}

const CSV_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "product_type",
  "item_group_id",
] as const;

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function buildMetaCatalogCsv(products: FeedProduct[]): string {
  const rows = products.map((product) =>
    [
      String(product.legacyId),
      product.title,
      product.description,
      product.availability,
      product.condition,
      formatFeedPrice(product.price, product.currency),
      product.salePrice != null ? formatFeedPrice(product.salePrice, product.currency) : "",
      product.link,
      product.imageLink,
      // Meta expects additional images as a comma-separated list in one column.
      product.additionalImageLinks.join(","),
      product.brand,
      product.productType,
      product.itemGroupId ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}
