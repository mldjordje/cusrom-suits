"use client";

import { useEffect, useRef } from "react";
import { trackViewItem, trackViewItemList, type AnalyticsProduct } from "@/lib/analytics/ecommerce";

/**
 * Fire-and-forget analytics beacons for server-rendered catalog pages.
 *
 * These render nothing — they exist because the shop grid and the product
 * detail page are server components and cannot call the client event layer
 * themselves.
 */

export function TrackProductView({ product }: { product: AnalyticsProduct }) {
  const lastKey = useRef<string | null>(null);
  const key = `${product.legacyId}:${product.size ?? ""}`;

  useEffect(() => {
    // Size switching does a client-side replace, so guard against re-firing for
    // the same variant on unrelated re-renders.
    if (lastKey.current === key) return;
    lastKey.current = key;
    trackViewItem(product);
    // `product` is rebuilt on every render; `key` is the identity that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

export function TrackProductListView({
  products,
  listName,
}: {
  products: AnalyticsProduct[];
  listName: string;
}) {
  const signature = `${listName}:${products.map((p) => p.legacyId).join(",")}`;
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (lastSignature.current === signature) return;
    lastSignature.current = signature;
    trackViewItemList(products, listName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
