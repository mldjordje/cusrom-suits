/**
 * Decides which orders belong on a customer's account page.
 *
 * Two kinds do. The obvious kind carries `config.storefrontUserId`, written
 * when the customer was signed in as they ordered. The other kind is every
 * order they placed as a guest — before they ever made an account, or on a
 * phone they were not signed in on — and those are the ones customers actually
 * write in about, because the confirmation email is the only trace they have.
 *
 * The guest match is by email, and it is only safe because the address it
 * matches against is one Supabase has confirmed belongs to this person. An
 * unconfirmed address is exactly the attack — sign up as someone else, read
 * their order history — so callers pass an empty `accountEmail` until it is
 * confirmed, and the email arm then never fires.
 */

export type AccountOrderMatch = "account" | "email";

export type MatchableOrder = {
  source?: string | null;
  type?: string | null;
  config?: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
};

export const normalizeEmail = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

export const matchOrderToAccount = (
  order: MatchableOrder,
  userId: string,
  accountEmail: string,
): AccountOrderMatch | null => {
  if (order.source !== "storefront" || order.type !== "webshop") return null;

  const config = order.config && typeof order.config === "object" ? order.config : null;
  if (userId && config && String(config.storefrontUserId || "") === userId) return "account";

  if (!accountEmail) return null;

  const contact = order.contact && typeof order.contact === "object" ? order.contact : null;
  const configCustomer =
    config && typeof config.customer === "object" && config.customer
      ? (config.customer as Record<string, unknown>)
      : null;

  if (normalizeEmail(contact?.email) === accountEmail) return "email";
  if (normalizeEmail(configCustomer?.email) === accountEmail) return "email";

  return null;
};
