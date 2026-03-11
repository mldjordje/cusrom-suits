export type AnanasTokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export type AnanasDiscountType = "SALE" | "SEASONAL_SALE" | "CLEARANCE_SALE";

export type AnanasDiscountInput = {
  merchantInventoryId: number;
  discountPrice: number;
  discountPriceCurrency: "RSD";
  dateFrom: string;
  dateTo: string;
  discountType: AnanasDiscountType;
};

export type AnanasDiscountUpdateInput = {
  discountId: string;
  newDateFrom: string;
  newDateTo: string;
  newDiscountPrice: number;
  newDiscountPriceCurrency: "RSD";
  newDiscountType: AnanasDiscountType;
};

export type AnanasProductRemote = {
  id: number;
  externalId?: string | number | null;
  ean?: string | null;
  sku?: string | null;
  name?: string | null;
  status?: string | null;
  stockLevel?: number | null;
  basePrice?: number | null;
};

export type AnanasSyncItemResult = {
  entityId: string;
  success: boolean;
  message?: string;
  response?: Record<string, unknown> | null;
};
