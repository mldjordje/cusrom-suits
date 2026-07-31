/**
 * Ananas platform rules, encoded once so the sync phases cannot drift from the
 * marketplace contract. Everything here is pure — see `__tests__/ananas-rules.test.ts`.
 *
 * Sources: developer.ananas.rs (rate-limits, bulk-products, edit-products-in-bulk,
 * schedule/update-discounts-in-bulk) + the "Ananas Product Flow API" document.
 */

export const ANANAS_LIMITS = {
  /** POST /product/api/v1/merchant-integration/import */
  import: { maxItems: 30_000, maxBytes: 5 * 1024 * 1024, callsPerDay: 1 },
  /** GET /product/api/v1/merchant-integration/products */
  getProducts: { maxPageSize: 200 },
  /** PUT /product/api/v1/merchant-integration/product/bulk */
  editProducts: { maxItems: 30_000, maxBytes: 5 * 1024 * 1024 },
  /** POST|PUT /payment/api/v1/merchant-integration/discounts */
  discounts: { maxItems: 500 },
  /** GET /payment/api/v1/merchant-integration/prices */
  prices: { maxIds: 100 },
  /** GET /order/api/v1/merchant-integration/orders */
  orders: { maxPageSize: 100 },
  /** Stock may be pushed repeatedly, but never more often than every 15 min. */
  stockMinIntervalMs: 15 * 60 * 1000,
} as const;

export const ANANAS_RATE_LIMITS = {
  perMinute: 60,
  perSecond: 5,
} as const;

export type AnanasDiscountType = "SALE" | "SEASONAL_SALE" | "CLEARANCE_SALE";

/** Max relative cut allowed by the platform: discount price >= 5% of base price. */
export const MAX_DISCOUNT_RATIO = 0.95;

const DISCOUNT_DURATION_DAYS: Record<AnanasDiscountType, { min: number; max: number | null }> = {
  SALE: { min: 1, max: 30 },
  SEASONAL_SALE: { min: 1, max: 60 },
  CLEARANCE_SALE: { min: 1, max: null },
};

/** Mandatory gap (days) between two SALE campaigns on the same product. */
export const SALE_COOLDOWN_DAYS = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ dates */

const pad = (value: number) => String(value).padStart(2, "0");

/** Ananas date format for discounts: dd/MM/yyyy. */
export const formatAnanasDate = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

/** ISO day (yyyy-MM-dd) used for our own state rows and `date-modified-after`. */
export const formatIsoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseAnanasDate = (value: string): Date | null => {
  const trimmed = String(value || "").trim();
  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const [, yyyy, mm, dd] = iso;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  return null;
};

export const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number) => {
  const next = startOfDay(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Inclusive day count: 22/07 → 22/07 is 1 day. */
export const durationInDays = (from: Date, to: Date) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY) + 1;

/* ------------------------------------------------------------ base prices */

/**
 * Base prices follow "danas za sutra": a price sent during the day becomes valid
 * at 00:00 the next day, except between 00:00 and 03:00 when it applies at once.
 * Returns the ISO day the pushed price actually becomes active.
 */
export const basePriceEffectiveDay = (now: Date): string => {
  const hour = now.getHours();
  if (hour < 3) return formatIsoDay(now);
  return formatIsoDay(addDays(now, 1));
};

/** True inside the 00:00–03:00 window, where a pushed price is live immediately. */
export const isImmediatePriceWindow = (now: Date) => now.getHours() < 3;

/* -------------------------------------------------------------------- EAN */

/**
 * GTIN-8/12/13/14 with the standard mod-10 check digit. Ananas matches products
 * on EAN only, so anything failing here must not be sent as an EAN.
 */
export const isValidEan = (value: unknown): boolean => {
  const digits = String(value ?? "").trim();
  if (!/^\d+$/.test(digits)) return false;
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const body = digits.slice(0, -1);
  const check = Number(digits.slice(-1));
  let sum = 0;
  // Weights alternate 3/1 starting from the rightmost body digit.
  for (let i = body.length - 1, weight = 3; i >= 0; i -= 1, weight = weight === 3 ? 1 : 3) {
    sum += Number(body[i]) * weight;
  }
  return (10 - (sum % 10)) % 10 === check;
};

/* --------------------------------------------------------------- chunking */

export type ChunkOptions = { maxItems: number; maxBytes?: number };

/**
 * Splits a payload into request-sized batches. Byte budget is measured on the
 * serialized array so a batch can never exceed the documented request size.
 */
export function chunkPayload<T>(items: T[], { maxItems, maxBytes }: ChunkOptions): T[][] {
  const batches: T[][] = [];
  let current: T[] = [];
  let currentBytes = 2; // "[]"

  for (const item of items) {
    const itemBytes = Buffer.byteLength(JSON.stringify(item), "utf8") + 1; // + comma
    const overflowsCount = current.length >= maxItems;
    const overflowsBytes = maxBytes != null && current.length > 0 && currentBytes + itemBytes > maxBytes;
    if (overflowsCount || overflowsBytes) {
      batches.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(item);
    currentBytes += itemBytes;
  }
  if (current.length) batches.push(current);
  return batches;
}

/* -------------------------------------------------------------- discounts */

export type DiscountWindowInput = {
  discountType: AnanasDiscountType;
  dateFrom: Date;
  dateTo: Date;
  basePrice: number;
  discountPrice: number;
  /** End date of the previous campaign on the same product, if any. */
  previousDateTo?: Date | null;
  /** Defaults to now; injected in tests. */
  today?: Date;
};

export type ValidationResult = { ok: true } | { ok: false; reason: string };

/**
 * Validates a discount before it is sent. Rejecting locally keeps a single bad
 * row from failing an entire 500-item batch on their side.
 */
export function validateDiscountWindow(input: DiscountWindowInput): ValidationResult {
  const today = startOfDay(input.today ? input.today : new Date());
  const from = startOfDay(input.dateFrom);
  const to = startOfDay(input.dateTo);

  if (to.getTime() < from.getTime()) return { ok: false, reason: "dateTo is before dateFrom" };
  if (from.getTime() < today.getTime()) return { ok: false, reason: "dateFrom is in the past" };

  const days = durationInDays(from, to);
  const bounds = DISCOUNT_DURATION_DAYS[input.discountType];
  if (days < bounds.min) return { ok: false, reason: `duration ${days}d below minimum ${bounds.min}d` };
  if (bounds.max != null && days > bounds.max) {
    return { ok: false, reason: `duration ${days}d exceeds maximum ${bounds.max}d` };
  }

  if (!(input.basePrice > 0)) return { ok: false, reason: "base price must be greater than 0" };
  if (!(input.discountPrice > 0)) return { ok: false, reason: "discount price must be greater than 0" };
  if (input.discountPrice >= input.basePrice) {
    return { ok: false, reason: "discount price must be lower than base price" };
  }
  if (input.discountPrice < input.basePrice * (1 - MAX_DISCOUNT_RATIO)) {
    return { ok: false, reason: "discount deeper than 95% of base price" };
  }

  if (input.discountType === "SEASONAL_SALE") {
    const seasonal = isSeasonalStartAllowed(from);
    if (!seasonal.ok) return seasonal;
  }

  if (input.previousDateTo) {
    const previousEnd = startOfDay(input.previousDateTo);
    const gapDays = Math.round((from.getTime() - previousEnd.getTime()) / MS_PER_DAY) - 1;
    if (gapDays < SALE_COOLDOWN_DAYS) {
      return { ok: false, reason: `needs ${SALE_COOLDOWN_DAYS}d pause after previous campaign` };
    }
  }

  return { ok: true };
}

/** Summer sale starts 1–15 July; winter sale starts 25 Dec – 10 Jan. */
export function isSeasonalStartAllowed(dateFrom: Date): ValidationResult {
  const month = dateFrom.getMonth() + 1;
  const day = dateFrom.getDate();
  const summer = month === 7 && day >= 1 && day <= 15;
  const winter = (month === 12 && day >= 25) || (month === 1 && day <= 10);
  if (summer || winter) return { ok: true };
  return { ok: false, reason: "SEASONAL_SALE must start 01–15 Jul or 25 Dec–10 Jan" };
}

/**
 * Once a campaign is running only the discount price may change, and only
 * downwards. Before it starts everything is editable.
 */
export function canUpdateDiscount(input: {
  currentDateFrom: Date;
  currentPrice: number;
  nextPrice: number;
  nextDateFrom?: Date | null;
  nextDateTo?: Date | null;
  nextType?: AnanasDiscountType | null;
  currentType?: AnanasDiscountType | null;
  currentDateTo?: Date | null;
  today?: Date;
}): ValidationResult {
  const today = startOfDay(input.today ? input.today : new Date());
  const started = startOfDay(input.currentDateFrom).getTime() <= today.getTime();
  if (!started) return { ok: true };

  if (input.nextPrice > input.currentPrice) {
    return { ok: false, reason: "active campaign price can only be lowered" };
  }
  const datesChanged =
    (input.nextDateFrom && startOfDay(input.nextDateFrom).getTime() !== startOfDay(input.currentDateFrom).getTime()) ||
    (input.nextDateTo &&
      input.currentDateTo &&
      startOfDay(input.nextDateTo).getTime() !== startOfDay(input.currentDateTo).getTime());
  if (datesChanged) return { ok: false, reason: "active campaign dates cannot change" };
  if (input.nextType && input.currentType && input.nextType !== input.currentType) {
    return { ok: false, reason: "active campaign type cannot change" };
  }
  return { ok: true };
}

/** Base price may not be touched while a campaign is running on that product. */
export const canUpdateBasePrice = (activeDiscount: { dateFrom: Date; dateTo: Date } | null, today = new Date()) => {
  if (!activeDiscount) return true;
  const day = startOfDay(today).getTime();
  return day < startOfDay(activeDiscount.dateFrom).getTime() || day > startOfDay(activeDiscount.dateTo).getTime();
};
