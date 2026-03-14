export type StorefrontCartItem = {
  legacyId: number;
  sku: string;
  name: string;
  size: string | null;
  material: string | null;
  price: number;
  image: string | null;
  quantity: number;
  maxQuantity: number | null;
  categoryLabel: string | null;
};
