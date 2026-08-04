/**
 * Ananas public API client (merchant integration).
 *
 * Endpoint paths verified against developer.ananas.rs on 2026-07-28:
 *   POST /iam/api/v1/auth/token
 *   POST /product/api/v1/merchant-integration/import          (catalog for listing)
 *   GET  /product/api/v1/merchant-integration/products        (listed products, size<=200)
 *   PUT  /product/api/v1/merchant-integration/product/bulk    (base price + stock)
 *   POST /product/api/v1/merchant-integration/product/publish
 *   POST /product/api/v1/merchant-integration/product/unpublish
 *   POST /payment/api/v1/merchant-integration/discounts       (schedule)
 *   PUT  /payment/api/v1/merchant-integration/discounts       (update)
 *   PUT  /payment/api/v1/merchant-integration/discounts/{id}/cancellations
 *   GET  /payment/api/v1/merchant-integration/prices          (max 100 ids)
 *   GET  /order/api/v1/merchant-integration/orders            (size<=100)
 */
import { ANANAS_LIMITS, ANANAS_RATE_LIMITS } from "@/lib/integrations/ananas/rules";
import type {
  AnanasAcceptedResponse,
  AnanasDiscountInput,
  AnanasDiscountUpdateInput,
  AnanasOrderStatusGroup,
  AnanasOrdersPage,
  AnanasPriceRow,
  AnanasProductRemote,
  AnanasProductUpdateInput,
  AnanasProductUpdateResult,
  AnanasScheduleResponse,
  AnanasTokenResponse,
  AnanasUpdateDiscountResponse,
} from "@/lib/integrations/ananas/types";
import type { SyncEnvironment } from "@/lib/integrations/core/types";
import type { AnanasImportProduct } from "@/lib/legacy/types";

type AnanasEnv = {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
};

const envByTarget = (environment: SyncEnvironment): AnanasEnv => {
  if (environment === "production") {
    const clientId =
      process.env.ANANAS_PROD_CLIENT_ID?.trim() || process.env.ANANAS_CLIENT_ID?.trim();
    const clientSecret =
      process.env.ANANAS_PROD_CLIENT_SECRET?.trim() ||
      process.env.ANANAS_CLIENT_SECRET?.trim();
    const baseUrl =
      process.env.ANANAS_PROD_API_BASE_URL?.trim() ||
      process.env.ANANAS_API_BASE_URL?.trim() ||
      "https://api.ananas.rs";
    return { clientId: clientId || "", clientSecret: clientSecret || "", baseUrl };
  }
  const clientId = process.env.ANANAS_STAGE_CLIENT_ID?.trim();
  const clientSecret = process.env.ANANAS_STAGE_CLIENT_SECRET?.trim();
  const baseUrl =
    process.env.ANANAS_STAGE_API_BASE_URL?.trim() || "https://api.qa2.ananastest.com";
  return { clientId: clientId || "", clientSecret: clientSecret || "", baseUrl };
};

const getEnv = (environment: SyncEnvironment = "production"): AnanasEnv => {
  const { clientId, clientSecret, baseUrl } = envByTarget(environment);
  if (!clientId || !clientSecret) {
    throw new Error(
      `Missing Ananas credentials for ${environment}. Configure env vars for selected environment.`,
    );
  }
  return { clientId, clientSecret, baseUrl };
};

export const hasAnanasCredentials = (environment: SyncEnvironment) => {
  const { clientId, clientSecret } = envByTarget(environment);
  return Boolean(clientId && clientSecret);
};

/* ---------------------------------------------------------------- limiter */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Their documented ceiling is 60 req/min and 5 req/s. We keep a per-process
 * sliding window; serverless instances are short-lived so this is a guard
 * against our own bursts (bulk loops), not a distributed limiter.
 */
const callTimestamps: number[] = [];

async function throttle() {
  for (;;) {
    const now = Date.now();
    while (callTimestamps.length && now - callTimestamps[0] > 60_000) callTimestamps.shift();
    const lastSecond = callTimestamps.filter((ts) => now - ts < 1_000).length;
    if (callTimestamps.length < ANANAS_RATE_LIMITS.perMinute && lastSecond < ANANAS_RATE_LIMITS.perSecond) {
      callTimestamps.push(now);
      return;
    }
    await sleep(lastSecond >= ANANAS_RATE_LIMITS.perSecond ? 250 : 1_000);
  }
}

/* ---------------------------------------------------------------- request */

type RequestOptions = {
  method: "GET" | "POST" | "PUT";
  url: string;
  token?: string;
  body?: unknown;
  /** Retries on 429 and 5xx. */
  retries?: number;
};

async function request<T>({ method, url, token, body, retries = 3 }: RequestOptions): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await throttle();
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store",
    });

    if (res.ok) {
      const text = await res.text();
      if (!text) return undefined as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }

    const errorBody = await res.text();
    lastError = new Error(`Ananas API ${method} ${new URL(url).pathname} -> ${res.status}: ${errorBody.slice(0, 800)}`);

    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt === retries) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1_000 * 2 ** attempt);
  }

  throw lastError || new Error("Ananas API request failed");
}

/* ------------------------------------------------------------------ token */

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<SyncEnvironment, CachedToken>();

export async function getAnanasTokenFor(environment: SyncEnvironment): Promise<string> {
  const cached = tokenCache.get(environment);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const { clientId, clientSecret, baseUrl } = getEnv(environment);
  const response = await request<AnanasTokenResponse>({
    method: "POST",
    url: `${baseUrl}/iam/api/v1/auth/token`,
    body: {
      grantType: "CLIENT_CREDENTIALS",
      clientId,
      clientSecret,
      scope: "public_api/full_access",
    },
  });
  if (!response?.access_token) throw new Error("Ananas token not returned");

  const expiresInSec = Number(response.expires_in || 0);
  tokenCache.set(environment, {
    token: response.access_token,
    expiresAt: Date.now() + (Number.isFinite(expiresInSec) && expiresInSec > 0 ? expiresInSec * 1000 : 3_600_000),
  });
  return response.access_token;
}

export const getAnanasToken = () => getAnanasTokenFor("production");

/** Dropped after a 401 so the next call re-authenticates. */
export const clearAnanasTokenCache = (environment?: SyncEnvironment) => {
  if (environment) tokenCache.delete(environment);
  else tokenCache.clear();
};

/* --------------------------------------------------------------- products */

/**
 * Sends the catalog for listing. This does NOT list products: the response id is
 * only an acknowledgement, the listing team processes the batch manually.
 * Caller is responsible for batching (see `chunkPayload`) and for the 1/day cadence.
 */
export async function importAnanasProductsFor(
  products: AnanasImportProduct[],
  environment: SyncEnvironment,
): Promise<AnanasAcceptedResponse | { skipped: true; reason: "no-products" }> {
  if (!Array.isArray(products) || products.length === 0) {
    return { skipped: true, reason: "no-products" as const };
  }
  if (products.length > ANANAS_LIMITS.import.maxItems) {
    throw new Error(`Import batch of ${products.length} exceeds ${ANANAS_LIMITS.import.maxItems} products`);
  }
  const token = await getAnanasTokenFor(environment);
  return request<AnanasAcceptedResponse>({
    method: "POST",
    url: `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/import`,
    token,
    body: products,
  });
}

export const importAnanasProducts = (products: AnanasImportProduct[]) =>
  importAnanasProductsFor(products, "production");

export type GetProductsParams = {
  page?: number;
  size?: number;
  search?: string;
  ean?: string;
  /** yyyy-MM-dd */
  dateModifiedAfter?: string;
};

export async function getAnanasProductsFor(
  params: GetProductsParams,
  environment: SyncEnvironment = "production",
): Promise<AnanasProductRemote[]> {
  const size = Math.min(Math.max(1, params.size ?? ANANAS_LIMITS.getProducts.maxPageSize), ANANAS_LIMITS.getProducts.maxPageSize);
  const query = new URLSearchParams({ page: String(params.page ?? 0), size: String(size) });
  if (params.search) query.set("search", params.search);
  if (params.ean) query.set("ean", params.ean);
  if (params.dateModifiedAfter) query.set("date-modified-after", params.dateModifiedAfter);

  const token = await getAnanasTokenFor(environment);
  const payload = await request<AnanasProductRemote[] | { content?: AnanasProductRemote[] }>({
    method: "GET",
    url: `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/products?${query.toString()}`,
    token,
  });
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.content) ? payload.content : [];
}

export const getAnanasProducts = (page = 0, size = ANANAS_LIMITS.getProducts.maxPageSize) =>
  getAnanasProductsFor({ page, size }, "production");

/** Base price and/or stock for already listed products, keyed by merchantInventoryId. */
export async function updateAnanasProductsFor(
  rows: AnanasProductUpdateInput[],
  environment: SyncEnvironment,
): Promise<AnanasProductUpdateResult[]> {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const token = await getAnanasTokenFor(environment);
  const payload = await request<AnanasProductUpdateResult[]>({
    method: "PUT",
    url: `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/product/bulk`,
    token,
    body: rows,
  });
  return Array.isArray(payload) ? payload : [];
}

export async function publishAnanasProductsFor(
  merchantInventoryIds: number[],
  environment: SyncEnvironment,
): Promise<AnanasAcceptedResponse | { skipped: true; reason: "no-products" }> {
  const ids = merchantInventoryIds.filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return { skipped: true, reason: "no-products" as const };
  const token = await getAnanasTokenFor(environment);
  return request<AnanasAcceptedResponse>({
    method: "POST",
    url: `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/product/publish`,
    token,
    body: ids,
  });
}

export async function unpublishAnanasProductsFor(
  merchantInventoryIds: number[],
  environment: SyncEnvironment,
): Promise<AnanasAcceptedResponse | { skipped: true; reason: "no-products" }> {
  const ids = merchantInventoryIds.filter((id) => Number.isFinite(id) && id > 0);
  if (!ids.length) return { skipped: true, reason: "no-products" as const };
  const token = await getAnanasTokenFor(environment);
  return request<AnanasAcceptedResponse>({
    method: "POST",
    url: `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/product/unpublish`,
    token,
    body: ids,
  });
}

/* -------------------------------------------------------------- discounts */

export async function scheduleAnanasDiscountsFor(
  discounts: AnanasDiscountInput[],
  environment: SyncEnvironment,
): Promise<AnanasScheduleResponse | { skipped: true; reason: "no-discounts" }> {
  if (!Array.isArray(discounts) || discounts.length === 0) {
    return { skipped: true, reason: "no-discounts" as const };
  }
  if (discounts.length > ANANAS_LIMITS.discounts.maxItems) {
    throw new Error(`Discount batch of ${discounts.length} exceeds ${ANANAS_LIMITS.discounts.maxItems}`);
  }
  const token = await getAnanasTokenFor(environment);
  return request<AnanasScheduleResponse>({
    method: "POST",
    url: `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts`,
    token,
    body: { discounts },
  });
}

export const scheduleAnanasDiscounts = (discounts: AnanasDiscountInput[]) =>
  scheduleAnanasDiscountsFor(discounts, "production");

export async function updateAnanasDiscountsFor(
  discounts: AnanasDiscountUpdateInput[],
  environment: SyncEnvironment,
): Promise<AnanasUpdateDiscountResponse | { skipped: true; reason: "no-discounts" }> {
  if (!Array.isArray(discounts) || discounts.length === 0) {
    return { skipped: true, reason: "no-discounts" as const };
  }
  if (discounts.length > ANANAS_LIMITS.discounts.maxItems) {
    throw new Error(`Discount batch of ${discounts.length} exceeds ${ANANAS_LIMITS.discounts.maxItems}`);
  }
  const token = await getAnanasTokenFor(environment);
  return request<AnanasUpdateDiscountResponse>({
    method: "PUT",
    url: `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts`,
    token,
    body: { discounts },
  });
}

export const updateAnanasDiscounts = (discounts: AnanasDiscountUpdateInput[]) =>
  updateAnanasDiscountsFor(discounts, "production");

export async function getAnanasDiscountsFor(
  dateFrom: string,
  dateTo: string,
  environment: SyncEnvironment,
): Promise<unknown> {
  const token = await getAnanasTokenFor(environment);
  const query = new URLSearchParams({ dateFrom, dateTo });
  return request<unknown>({
    method: "GET",
    url: `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts?${query.toString()}`,
    token,
  });
}

export async function cancelAnanasDiscountFor(discountId: string, environment: SyncEnvironment) {
  const token = await getAnanasTokenFor(environment);
  return request<unknown>({
    method: "PUT",
    url: `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts/${encodeURIComponent(discountId)}/cancellations`,
    token,
    body: {},
  });
}

export const cancelAnanasDiscount = (discountId: string) =>
  cancelAnanasDiscountFor(discountId, "production");

/**
 * Effective prices per day — the only way to see what the platform actually
 * charges (base vs. sellable) and whether a discount is attached.
 *
 * NOT wired into any sync phase yet. Note before using it: on stage this
 * endpoint lives on a different host than every other one — their docs give
 * `api.svc.qa2.ananastest.com`, and hitting it on the usual
 * `api.qa2.ananastest.com` returns 500 "No static resource" (verified
 * 2026-08-04). Production is the normal `api.ananas.rs`.
 */
export async function getAnanasPricesFor(
  merchantInventoryIds: number[],
  dateFrom: string,
  environment: SyncEnvironment,
): Promise<AnanasPriceRow[]> {
  const ids = merchantInventoryIds.filter((id) => Number.isFinite(id) && id > 0).slice(0, ANANAS_LIMITS.prices.maxIds);
  if (!ids.length) return [];
  const token = await getAnanasTokenFor(environment);
  const query = new URLSearchParams({ dateFrom, merchantInventoryIds: ids.join(",") });
  const payload = await request<AnanasPriceRow[] | { content?: AnanasPriceRow[] }>({
    method: "GET",
    url: `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/prices?${query.toString()}`,
    token,
  });
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.content) ? payload.content : [];
}

/* ----------------------------------------------------------------- orders */

export type GetOrdersParams = {
  page?: number;
  size?: number;
  orderId?: string;
  statusGroup?: AnanasOrderStatusGroup;
  /** yyyy-MM-dd'T'HH:mm:ss.SSSXXX */
  dateFrom?: string;
  dateTo?: string;
};

export async function getAnanasOrdersFor(
  params: GetOrdersParams,
  environment: SyncEnvironment,
): Promise<AnanasOrdersPage> {
  const size = Math.min(Math.max(1, params.size ?? 50), ANANAS_LIMITS.orders.maxPageSize);
  const query = new URLSearchParams({ page: String(params.page ?? 0), size: String(size) });
  if (params.orderId) query.set("orderId", params.orderId);
  if (params.statusGroup) query.set("statusGroup", params.statusGroup);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);

  const token = await getAnanasTokenFor(environment);
  const payload = await request<AnanasOrdersPage | AnanasOrdersPage["content"]>({
    method: "GET",
    url: `${getEnv(environment).baseUrl}/order/api/v1/merchant-integration/orders?${query.toString()}`,
    token,
  });
  if (Array.isArray(payload)) return { content: payload };
  return payload || {};
}

export const getAnanasOrders = (params: GetOrdersParams = {}) =>
  getAnanasOrdersFor(params, "production");
