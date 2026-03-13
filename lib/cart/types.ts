export type StorefrontCartItem = {
  legacyId: number;
  sku: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  maxQuantity: number | null;
  categoryLabel: string | null;
};

