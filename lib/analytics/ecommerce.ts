"use client";

/**
 * Client-side ecommerce event layer.
 *
 * One call site emits to every configured destination (GA4 + Meta Pixel), so
 * product code never has to know which tags are switched on. Every function is
 * a no-op when the tags are absent or consent has not been granted — the
 * loaders in AnalyticsScripts simply never define `gtag`/`fbq`.
 */

import { getAnalyticsCurrency } from "@/lib/analytics/config";

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
    dataLayer?: unknown[];
  }
}

export type AnalyticsProduct = {
  legacyId: number | string;
  sku?: string | null;
  name: string;
  price: number;
  quantity?: number;
  category?: string | null;
  size?: string | null;
};

const gtag = (...args: unknown[]) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
};

const fbq = (...args: unknown[]) => {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq(...args);
};

const toGa4Item = (product: AnalyticsProduct, index?: number) => ({
  item_id: String(product.sku || product.legacyId),
  item_name: product.name,
  price: Number(product.price || 0),
  quantity: Number(product.quantity || 1),
  ...(product.category ? { item_category: product.category } : {}),
  ...(product.size ? { item_variant: product.size } : {}),
  ...(index == null ? {} : { index }),
});

const sumValue = (products: AnalyticsProduct[]) =>
  products.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);

const contentIds = (products: AnalyticsProduct[]) =>
  products.map((product) => String(product.sku || product.legacyId));

export const trackViewItemList = (products: AnalyticsProduct[], listName: string) => {
  if (!products.length) return;
  gtag("event", "view_item_list", {
    item_list_name: listName,
    currency: getAnalyticsCurrency(),
    items: products.slice(0, 30).map((product, index) => toGa4Item(product, index)),
  });
};

export const trackViewItem = (product: AnalyticsProduct) => {
  const currency = getAnalyticsCurrency();
  gtag("event", "view_item", {
    currency,
    value: Number(product.price || 0),
    items: [toGa4Item(product)],
  });
  fbq("track", "ViewContent", {
    content_type: "product",
    content_ids: contentIds([product]),
    content_name: product.name,
    currency,
    value: Number(product.price || 0),
  });
};

export const trackAddToCart = (product: AnalyticsProduct) => {
  const currency = getAnalyticsCurrency();
  const value = Number(product.price || 0) * Number(product.quantity || 1);
  gtag("event", "add_to_cart", { currency, value, items: [toGa4Item(product)] });
  fbq("track", "AddToCart", {
    content_type: "product",
    content_ids: contentIds([product]),
    content_name: product.name,
    currency,
    value,
  });
};

export const trackRemoveFromCart = (product: AnalyticsProduct) => {
  gtag("event", "remove_from_cart", {
    currency: getAnalyticsCurrency(),
    value: Number(product.price || 0) * Number(product.quantity || 1),
    items: [toGa4Item(product)],
  });
};

export const trackViewCart = (products: AnalyticsProduct[]) => {
  if (!products.length) return;
  gtag("event", "view_cart", {
    currency: getAnalyticsCurrency(),
    value: sumValue(products),
    items: products.map((product) => toGa4Item(product)),
  });
};

export const trackBeginCheckout = (products: AnalyticsProduct[]) => {
  if (!products.length) return;
  const currency = getAnalyticsCurrency();
  const value = sumValue(products);
  gtag("event", "begin_checkout", { currency, value, items: products.map((p) => toGa4Item(p)) });
  fbq("track", "InitiateCheckout", {
    content_type: "product",
    content_ids: contentIds(products),
    num_items: products.reduce((sum, p) => sum + Number(p.quantity || 1), 0),
    currency,
    value,
  });
};

export const trackPurchase = (input: {
  orderId: string;
  products: AnalyticsProduct[];
  value: number;
  shipping?: number;
  discount?: number;
  coupon?: string | null;
}) => {
  const currency = getAnalyticsCurrency();
  gtag("event", "purchase", {
    transaction_id: input.orderId,
    currency,
    value: Number(input.value || 0),
    shipping: Number(input.shipping || 0),
    ...(input.coupon ? { coupon: input.coupon } : {}),
    items: input.products.map((product) => toGa4Item(product)),
  });
  // eventID must match the server-side Conversions API hit so Meta deduplicates
  // the two reports of the same purchase. /api/orders uses the order number too.
  fbq(
    "track",
    "Purchase",
    {
      content_type: "product",
      content_ids: contentIds(input.products),
      num_items: input.products.reduce((sum, p) => sum + Number(p.quantity || 1), 0),
      currency,
      value: Number(input.value || 0),
    },
    { eventID: input.orderId },
  );
};

export const trackSearch = (term: string) => {
  if (!term.trim()) return;
  gtag("event", "search", { search_term: term });
  fbq("track", "Search", { search_string: term });
};

export const trackNewsletterSignup = (source: string) => {
  gtag("event", "generate_lead", { method: source });
  fbq("track", "Lead", { content_name: source });
};
