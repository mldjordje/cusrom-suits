import type {
  AnanasProductRemote,
  AnanasDiscountInput,
  AnanasDiscountUpdateInput,
  AnanasTokenResponse,
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

async function postJson<T>(
  url: string,
  payload: unknown,
  token?: string,
  method: "POST" | "PUT" = "POST",
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ananas API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

async function getJson<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ananas API error ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export async function getAnanasToken(): Promise<string> {
  return getAnanasTokenFor("production");
}

export async function getAnanasTokenFor(environment: SyncEnvironment): Promise<string> {
  const { clientId, clientSecret, baseUrl } = getEnv(environment);
  const response = await postJson<AnanasTokenResponse>(`${baseUrl}/iam/api/v1/auth/token`, {
    grantType: "CLIENT_CREDENTIALS",
    clientId,
    clientSecret,
    scope: "public_api/full_access",
  });
  if (!response?.access_token) {
    throw new Error("Ananas token not returned");
  }
  return response.access_token;
}

export async function importAnanasProducts(products: AnanasImportProduct[]) {
  return importAnanasProductsFor(products, "production");
}

export async function importAnanasProductsFor(
  products: AnanasImportProduct[],
  environment: SyncEnvironment,
) {
  if (!Array.isArray(products) || products.length === 0) {
    return { skipped: true, reason: "no-products" as const };
  }
  const token = await getAnanasTokenFor(environment);
  return postJson<unknown>(
    `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/import`,
    products,
    token,
    "POST",
  );
}

export async function getAnanasProducts(page = 0, size = 2000) {
  return getAnanasProductsFor(page, size, "production");
}

export async function getAnanasProductsFor(
  page = 0,
  size = 2000,
  environment: SyncEnvironment = "production",
) {
  const token = await getAnanasTokenFor(environment);
  return getJson<AnanasProductRemote[]>(
    `${getEnv(environment).baseUrl}/product/api/v1/merchant-integration/products?page=${page}&size=${size}`,
    token,
  );
}

export async function scheduleAnanasDiscounts(discounts: AnanasDiscountInput[]) {
  return scheduleAnanasDiscountsFor(discounts, "production");
}

export async function scheduleAnanasDiscountsFor(
  discounts: AnanasDiscountInput[],
  environment: SyncEnvironment,
) {
  if (!Array.isArray(discounts) || discounts.length === 0) {
    return { skipped: true, reason: "no-discounts" as const };
  }
  const token = await getAnanasTokenFor(environment);
  return postJson<unknown>(
    `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts`,
    { discounts },
    token,
    "POST",
  );
}

export async function updateAnanasDiscounts(discounts: AnanasDiscountUpdateInput[]) {
  return updateAnanasDiscountsFor(discounts, "production");
}

export async function updateAnanasDiscountsFor(
  discounts: AnanasDiscountUpdateInput[],
  environment: SyncEnvironment,
) {
  if (!Array.isArray(discounts) || discounts.length === 0) {
    return { skipped: true, reason: "no-discounts" as const };
  }
  const token = await getAnanasTokenFor(environment);
  return postJson<unknown>(
    `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts`,
    { discounts },
    token,
    "PUT",
  );
}

export async function getAnanasDiscounts(dateFrom: string, dateTo: string) {
  return getAnanasDiscountsFor(dateFrom, dateTo, "production");
}

export async function getAnanasDiscountsFor(
  dateFrom: string,
  dateTo: string,
  environment: SyncEnvironment,
) {
  const token = await getAnanasTokenFor(environment);
  const query = new URLSearchParams({ dateFrom, dateTo });
  return getJson<unknown>(
    `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts?${query.toString()}`,
    token,
  );
}

export async function cancelAnanasDiscount(discountId: string) {
  return cancelAnanasDiscountFor(discountId, "production");
}

export async function cancelAnanasDiscountFor(discountId: string, environment: SyncEnvironment) {
  const token = await getAnanasTokenFor(environment);
  return postJson<unknown>(
    `${getEnv(environment).baseUrl}/payment/api/v1/merchant-integration/discounts/${discountId}/cancellations`,
    {},
    token,
    "PUT",
  );
}
