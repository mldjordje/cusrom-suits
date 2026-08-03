import type { AnanasDiscountType } from "@/lib/integrations/ananas/rules";

export type { AnanasDiscountType };

export type AnanasTokenResponse = {
  access_token: string;
  expires_in?: number | string;
  token_type?: string;
  scope?: string;
};

export type AnanasDiscountInput = {
  merchantInventoryId: number;
  discountPrice: number;
  discountPriceCurrency: "RSD";
  /** dd/MM/yyyy */
  dateFrom: string;
  /** dd/MM/yyyy */
  dateTo: string;
  discountType: AnanasDiscountType;
};

export type AnanasDiscountUpdateInput = {
  discountId: string;
  /** Must be null for campaigns that already started. */
  newDateFrom: string | null;
  newDateTo: string | null;
  newDiscountPrice: number;
  newDiscountPriceCurrency: "RSD";
  newDiscountType: AnanasDiscountType | null;
};

export type AnanasScheduleResponse = {
  scheduleResult?: Array<{
    success?: boolean;
    data?: { merchantInventoryId?: number; discountId?: string };
    error?: { errorMessage?: string };
  }>;
};

export type AnanasUpdateDiscountResponse = {
  updateResult?: Array<{
    success?: boolean;
    data?: { discountId?: string };
    error?: { errorMessage?: string };
  }>;
};

/** Which warehouse the listing sits in. Ananas-fulfilled rows must never get stock pushes. */
export type AnanasWarehouse = "MERCHANT_WAREHOUSE" | "ANANAS_WAREHOUSE";

export type AnanasProductStatus =
  | "READY_FOR_PUBLISH"
  | "PUBLISHED"
  | "SOLD_OUT"
  | "UNPUBLISHED"
  | "UNPUBLISHED_OOS";

export type AnanasProductRemote = {
  id: number;
  /** Always null in practice — they do not echo our externalId back (QA, 2026-07-31). */
  externalId?: string | number | null;
  /** Also blanked on listing; replaced by `ananasCode`. */
  ean?: string | null;
  /** Ananas' own product code, issued when EAN is absent. */
  ananasCode?: string | null;
  /** Shared by all variants of one style — their equivalent of our parentEan grouping. */
  groupId?: string | null;
  sku?: string | null;
  name?: string | null;
  brand?: string | null;
  status?: AnanasProductStatus | string | null;
  warehouse?: AnanasWarehouse | string | null;
  stockLevel?: number | null;
  basePrice?: number | null;
  newBasePrice?: number | null;
  categories?: unknown;
};

/** Row accepted by PUT /product/api/v1/merchant-integration/product/bulk. */
export type AnanasProductUpdateInput = {
  id: number;
  basePrice?: number;
  stockLevel?: number;
  vat?: number;
  sku?: string;
  packageWeightValue?: number;
  packageWeightUnit?: string;
  serviceable?: boolean;
};

export type AnanasProductUpdateResult = {
  status?: string;
  errors?: unknown[];
  myProductId?: number;
  ean?: string | null;
  productName?: string | null;
};

/** Async endpoints (import, publish, unpublish) only acknowledge receipt. */
export type AnanasAcceptedResponse = { id?: string };

export type AnanasPriceRow = {
  merchantInventoryId: number;
  basePrice?: number | null;
  sellablePrice?: number | null;
  discountId?: string | null;
};

export type AnanasOrderItem = {
  id?: number | string;
  quantity?: number;
  confirmedQuantity?: number;
  packedQuantity?: number;
  basePrice?: number;
  shippingCost?: number;
  chargedPrice?: number;
  productName?: string;
  productId?: number | string;
  merchant?: unknown;
};

export type AnanasOrder = {
  id?: number | string;
  createdDate?: string;
  totalPrice?: number;
  currency?: string;
  paymentMethods?: unknown;
  numberOfItems?: number;
  items?: AnanasOrderItem[];
  billingAddress?: unknown;
};

export type AnanasOrdersPage = {
  content?: AnanasOrder[];
  totalPages?: number;
  totalElements?: number;
  number?: number;
  size?: number;
  last?: boolean;
  empty?: boolean;
};

export type AnanasOrderStatusGroup = "SG_FOR_CONFIRMATION" | "SG_PROCESSED";

export type AnanasSyncItemResult = {
  entityId: string;
  success: boolean;
  message?: string;
  response?: Record<string, unknown> | null;
};
