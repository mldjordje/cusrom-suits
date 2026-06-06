export const FIRST_PUBLIC_ORDER_NUMBER = 100;

export const getPublicOrderNumber = (order: { config?: Record<string, unknown> | null } | null | undefined) => {
  const value = Number(order?.config?.publicOrderNumber);
  return Number.isInteger(value) && value >= FIRST_PUBLIC_ORDER_NUMBER ? value : null;
};

export const formatPublicOrderNumber = (
  order: { id?: string | number | null; config?: Record<string, unknown> | null } | null | undefined,
) => {
  const publicOrderNumber = getPublicOrderNumber(order);
  return publicOrderNumber == null ? String(order?.id || "") : String(publicOrderNumber);
};

export const getNextPublicOrderNumber = (
  orders: Array<{ config?: Record<string, unknown> | null } | null | undefined>,
) => {
  const maxExisting = orders.reduce((max, order) => {
    const value = getPublicOrderNumber(order);
    return value == null ? max : Math.max(max, value);
  }, FIRST_PUBLIC_ORDER_NUMBER - 1);

  return maxExisting + 1;
};
