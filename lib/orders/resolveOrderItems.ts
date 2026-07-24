/**
 * Server-side authority for what an order actually contains and costs.
 *
 * The storefront cart lives in localStorage, so every field it posts to
 * /api/orders is attacker-controlled — including `price` and `totals.subtotal`.
 * Nothing from the payload is trusted for money: each line is re-resolved from
 * the catalog by `legacyId` and re-priced from the database.
 *
 * Kept free of Next.js request APIs so it can be unit tested directly.
 */

export type IncomingOrderItem = {
  legacyId: unknown;
  sku?: unknown;
  name?: unknown;
  size?: unknown;
  material?: unknown;
  price?: unknown;
  quantity?: unknown;
  image?: unknown;
  categoryLabel?: unknown;
};

export type ResolvedOrderItem = {
  legacyId: number;
  sku: string;
  name: string;
  size: string | null;
  material: string | null;
  /** Authoritative unit price from the catalog, never from the client. */
  price: number;
  quantity: number;
  image: string | null;
  categoryLabel: string | null;
};

export type CatalogPriceSource = {
  legacyId: number;
  sku: string;
  name: string;
  priceFinalGross: number;
  isActive: boolean;
  isExported: boolean;
  stockWarehouse1: number;
  stockTotal: number;
  coverImage: string | null;
  images: string[];
  categories: { name: string }[];
};

export type OrderItemRejection = {
  legacyId: number;
  reason: "not_found" | "unavailable" | "out_of_stock" | "no_price";
};

export type PriceMismatch = {
  legacyId: number;
  clientPrice: number;
  serverPrice: number;
};

export type ResolveOrderItemsResult = {
  items: ResolvedOrderItem[];
  subtotal: number;
  quantity: number;
  rejected: OrderItemRejection[];
  mismatches: PriceMismatch[];
  /** True when a line was silently reduced because stock could not cover it. */
  quantityAdjusted: boolean;
};

export const MAX_ORDER_LINE_QUANTITY = 20;

export const getAvailableStock = (
  product: Pick<CatalogPriceSource, "stockTotal" | "stockWarehouse1">,
) => {
  const total = Number(product.stockTotal || 0);
  const warehouse1 = Number(product.stockWarehouse1 || 0);
  return total > 0 ? total : warehouse1;
};

const toText = (value: unknown) => String(value ?? "").trim();

/**
 * Narrows the raw payload to well-formed lines and merges duplicate legacyIds.
 * Runs before any catalog lookup so a hostile payload cannot fan out into
 * hundreds of database reads.
 */
export const normalizeIncomingItems = (
  items: IncomingOrderItem[],
  options?: { maxLines?: number },
): Array<{ legacyId: number; quantity: number; size: string | null; material: string | null }> => {
  const maxLines = options?.maxLines ?? 50;
  const byLegacyId = new Map<number, { legacyId: number; quantity: number; size: string | null; material: string | null }>();

  for (const raw of items) {
    const legacyId = Number(raw?.legacyId);
    if (!Number.isFinite(legacyId) || legacyId <= 0) continue;

    const quantity = Math.min(
      MAX_ORDER_LINE_QUANTITY,
      Math.max(1, Math.floor(Number(raw?.quantity ?? 1) || 1)),
    );
    const existing = byLegacyId.get(legacyId);
    if (existing) {
      existing.quantity = Math.min(MAX_ORDER_LINE_QUANTITY, existing.quantity + quantity);
      continue;
    }

    if (byLegacyId.size >= maxLines) break;
    byLegacyId.set(legacyId, {
      legacyId,
      quantity,
      size: toText(raw?.size) || null,
      material: toText(raw?.material) || null,
    });
  }

  return Array.from(byLegacyId.values());
};

/**
 * Re-prices every line against the catalog.
 *
 * `loadProduct` is injected so the caller decides where the catalog comes from
 * (Supabase, file fallback, or a test double).
 */
export const resolveOrderItems = async (
  incoming: IncomingOrderItem[],
  loadProduct: (legacyId: number) => Promise<CatalogPriceSource | null>,
  options?: { maxLines?: number; allowOutOfStock?: boolean },
): Promise<ResolveOrderItemsResult> => {
  const normalized = normalizeIncomingItems(incoming, { maxLines: options?.maxLines });
  const clientPriceByLegacyId = new Map<number, number>();
  for (const raw of incoming) {
    const legacyId = Number(raw?.legacyId);
    if (Number.isFinite(legacyId) && !clientPriceByLegacyId.has(legacyId)) {
      clientPriceByLegacyId.set(legacyId, Number(raw?.price ?? 0) || 0);
    }
  }

  const items: ResolvedOrderItem[] = [];
  const rejected: OrderItemRejection[] = [];
  const mismatches: PriceMismatch[] = [];
  let quantityAdjusted = false;

  const products = await Promise.all(
    normalized.map(async (line) => ({ line, product: await loadProduct(line.legacyId) })),
  );

  for (const { line, product } of products) {
    if (!product) {
      rejected.push({ legacyId: line.legacyId, reason: "not_found" });
      continue;
    }
    if (!product.isActive || !product.isExported) {
      rejected.push({ legacyId: line.legacyId, reason: "unavailable" });
      continue;
    }

    const price = Number(product.priceFinalGross || 0);
    if (!(price > 0)) {
      rejected.push({ legacyId: line.legacyId, reason: "no_price" });
      continue;
    }

    const stock = getAvailableStock(product);
    if (stock <= 0 && !options?.allowOutOfStock) {
      rejected.push({ legacyId: line.legacyId, reason: "out_of_stock" });
      continue;
    }

    const quantity = options?.allowOutOfStock || stock <= 0
      ? line.quantity
      : Math.min(line.quantity, stock);
    if (quantity < line.quantity) quantityAdjusted = true;

    const clientPrice = clientPriceByLegacyId.get(line.legacyId) ?? 0;
    if (clientPrice > 0 && Math.round(clientPrice) !== Math.round(price)) {
      mismatches.push({ legacyId: line.legacyId, clientPrice, serverPrice: price });
    }

    items.push({
      legacyId: product.legacyId,
      sku: product.sku,
      name: product.name,
      size: line.size,
      material: line.material,
      price,
      quantity,
      image: product.coverImage || product.images[0] || null,
      categoryLabel: product.categories[0]?.name || null,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return { items, subtotal, quantity, rejected, mismatches, quantityAdjusted };
};

export const describeRejections = (
  rejected: OrderItemRejection[],
  isEn = false,
): string => {
  if (!rejected.length) return "";
  const hasStockIssue = rejected.some((entry) => entry.reason === "out_of_stock");
  if (hasStockIssue) {
    return isEn
      ? "Some items are no longer in stock. Please review your cart."
      : "Neki artikli vise nisu na stanju. Proveri korpu.";
  }
  return isEn
    ? "Some items are no longer available. Please review your cart."
    : "Neki artikli vise nisu dostupni. Proveri korpu.";
};
