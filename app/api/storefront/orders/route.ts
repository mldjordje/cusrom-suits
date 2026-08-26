import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getStorefrontUserFromCookies } from "@/lib/supabase/storefront-server";
import { readPersistentJsonFile } from "@/lib/storage/persistentJson";
import { matchOrderToAccount, normalizeEmail, type AccountOrderMatch } from "@/lib/orders/accountMatch";

const ORDERS_PATH = "data/orders.json";
const ORDER_LIMIT = 50;

export type StorefrontOrderRow = {
  id: string | number;
  status?: string | null;
  price?: number | null;
  created_at?: string | null;
  contact?: Record<string, unknown> | null;
  config?: Record<string, unknown> | null;
  /** How this order reached the account — see `matchOrderToAccount`. */
  matchedBy?: AccountOrderMatch;
};

type RawOrder = {
  id?: string | number;
  source?: string | null;
  type?: string | null;
  status?: string | null;
  price?: number | null;
  created_at?: string | null;
  config?: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
};

const toRow = (order: RawOrder, matchedBy: AccountOrderMatch): StorefrontOrderRow => ({
  id: order.id ?? "",
  status: order.status ?? null,
  price: order.price ?? null,
  created_at: order.created_at ?? null,
  contact: order.contact ?? null,
  config: order.config ?? null,
  matchedBy,
});

const byNewestFirst = (a: StorefrontOrderRow, b: StorefrontOrderRow) =>
  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

export async function GET() {
  const { user } = await getStorefrontUserFromCookies();
  if (!user?.id) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const accountEmail = user.email_confirmed_at ? normalizeEmail(user.email) : "";

  const supabase = getServiceSupabase();
  if (!supabase) {
    const orders = await readPersistentJsonFile<RawOrder[]>(ORDERS_PATH, []);
    const rows: StorefrontOrderRow[] = [];
    for (const order of orders) {
      const matchedBy = matchOrderToAccount(order, user.id, accountEmail);
      if (matchedBy) rows.push(toRow(order, matchedBy));
    }
    rows.sort(byNewestFirst);
    return NextResponse.json({
      success: true,
      data: rows.slice(0, ORDER_LIMIT),
      storage: "file",
    });
  }

  /* Two selects rather than one `.or()`: the account arm needs a jsonb
     containment match and the email arm needs a text comparison across two
     different columns, and PostgREST cannot express both sides of that in a
     single or-filter without losing the index on either. Two small indexed
     reads merged here are cheaper than one clever unindexed one. */
  const [ownedResult, emailResult] = await Promise.all([
    supabase
      .from("orders")
      .select("id, status, price, created_at, contact, config")
      .contains("config", { storefrontUserId: user.id })
      .order("created_at", { ascending: false })
      .limit(ORDER_LIMIT),
    accountEmail
      ? supabase
          .from("orders")
          .select("id, status, price, created_at, contact, config")
          /* Both spellings: checkout now stores the address lowercased, but
             orders placed before that kept whatever the customer typed. `in`
             rather than `ilike` on purpose — an underscore is a legal email
             character and a wildcard in `ilike`, so `a_b@x.com` would quietly
             match a stranger's `axb@x.com`. */
          .in("contact->>email", [...new Set([accountEmail, String(user.email || "").trim()])])
          .order("created_at", { ascending: false })
          .limit(ORDER_LIMIT)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  if (ownedResult.error) {
    return NextResponse.json({ success: false, message: ownedResult.error.message }, { status: 500 });
  }
  /* A failure on the email arm is not worth failing the page for — the customer
     still gets every order tied to their account, which is the common case. */
  const emailOrders = emailResult.error ? [] : (emailResult.data ?? []);

  const byId = new Map<string, StorefrontOrderRow>();
  for (const order of [...(ownedResult.data ?? []), ...emailOrders] as RawOrder[]) {
    const matchedBy = matchOrderToAccount(order, user.id, accountEmail);
    if (!matchedBy) continue;
    const key = String(order.id ?? "");
    if (!key) continue;
    /* An order that matches both ways is an account order — the stronger link
       wins, so it never gets labelled as a guest order in the list. */
    const existing = byId.get(key);
    if (existing && existing.matchedBy === "account") continue;
    byId.set(key, toRow(order, matchedBy));
  }

  const rows = [...byId.values()].sort(byNewestFirst).slice(0, ORDER_LIMIT);

  return NextResponse.json({ success: true, data: rows });
}
