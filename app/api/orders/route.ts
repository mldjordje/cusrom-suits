import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";
import type { StorefrontCartItem } from "@/lib/cart/types";
import type { LegacyCatalogProduct } from "@/lib/legacy/types";

const ORDERS_PATH = "data/orders.json";
const LEGACY_PRODUCTS_PATH = "data/legacy-products.json";
const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN;

const hasAdminToken = (req: NextRequest) => {
  if (!ADMIN_ACCESS_TOKEN) return true;
  const headerToken = req.headers.get("x-admin-token");
  const cookieToken = req.cookies.get("admin_token")?.value;
  return headerToken === ADMIN_ACCESS_TOKEN || cookieToken === ADMIN_ACCESS_TOKEN;
};

const requireAdmin = (req: NextRequest) => {
  if (hasAdminToken(req)) return null;
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
};

const readOrdersFile = async () => readJsonFile<any[]>(ORDERS_PATH, []);

const writeOrdersFile = async (orders: any[]) => {
  await writeJsonFile(ORDERS_PATH, orders);
};

const decrementStockForItems = async (
  items: Array<{ legacyId: number; quantity: number }>,
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>> | null,
) => {
  if (!items.length) return;

  if (!supabase) {
    const products = await readJsonFile<LegacyCatalogProduct[]>(LEGACY_PRODUCTS_PATH, []);
    const byId = new Map(products.map((product) => [Number(product.legacyId), product]));

    for (const item of items) {
      const product = byId.get(Number(item.legacyId));
      if (!product) continue;
      const qty = Math.max(1, Number(item.quantity || 1));
      product.stock = {
        ...product.stock,
        warehouse1: Math.max(0, Number(product.stock?.warehouse1 || 0) - qty),
        total: Math.max(0, Number(product.stock?.total || 0) - qty),
      };
    }

    await writeJsonFile(LEGACY_PRODUCTS_PATH, products);
    return;
  }

  for (const item of items) {
    const legacyId = Number(item.legacyId);
    const qty = Math.max(1, Number(item.quantity || 1));
    if (!legacyId || !qty) continue;

    const { data: row, error: fetchError } = await supabase
      .from("catalog_products")
      .select("stock_warehouse_1, stock_total")
      .eq("legacy_id", legacyId)
      .maybeSingle();

    if (fetchError || !row) continue;

    const nextWarehouse1 = Math.max(0, Number((row as Record<string, unknown>).stock_warehouse_1 || 0) - qty);
    const nextTotal = Math.max(0, Number((row as Record<string, unknown>).stock_total || 0) - qty);

    await supabase
      .from("catalog_products")
      .update({
        stock_warehouse_1: nextWarehouse1,
        stock_total: nextTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("legacy_id", legacyId);
  }
};

const isStorefrontPayload = (payload: any): payload is {
  source?: string;
  items: StorefrontCartItem[];
  customer?: Record<string, unknown> | null;
  totals?: Record<string, unknown> | null;
  note?: string | null;
} => Array.isArray(payload?.items) && payload.items.length > 0;

export async function POST(req: NextRequest) {
  const supabase = getServiceSupabase();
  const payload = await req.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
  }

  if (isStorefrontPayload(payload)) {
    const items = payload.items
      .map((item) => ({
        legacyId: Number(item.legacyId),
        sku: String(item.sku || ""),
        name: String(item.name || ""),
        price: Number(item.price || 0),
        quantity: Math.max(1, Number(item.quantity || 1)),
        image: item.image ? String(item.image) : null,
        categoryLabel: item.categoryLabel ? String(item.categoryLabel) : null,
      }))
      .filter((item) => Number.isFinite(item.legacyId) && item.legacyId > 0 && item.name.length > 0);

    if (!items.length) {
      return NextResponse.json({ success: false, message: "Korpa je prazna." }, { status: 400 });
    }

    const customer = payload.customer && typeof payload.customer === "object"
      ? (payload.customer as Record<string, unknown>)
      : {};
    const fullName = String(customer.fullName || "").trim();
    const email = String(customer.email || "").trim();
    const phone = String(customer.phone || "").trim();
    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "Ime, email i telefon su obavezni." },
        { status: 400 },
      );
    }

    const subtotal = Number(payload?.totals?.subtotal || items.reduce((sum, item) => sum + item.price * item.quantity, 0));
    const quantity = Number(payload?.totals?.quantity || items.reduce((sum, item) => sum + item.quantity, 0));
    const contact = {
      ime: fullName,
      email,
      telefon: phone,
      adresa: String(customer.address || "").trim(),
      grad: String(customer.city || "").trim(),
      postanski_broj: String(customer.postalCode || "").trim(),
      napomena: String(customer.note || payload.note || "").trim(),
    };

    const config = {
      source: "storefront",
      type: "webshop",
      items,
      totals: {
        subtotal,
        quantity,
      },
      customer: {
        fullName,
        email,
        phone,
        address: contact.adresa,
        city: contact.grad,
        postalCode: contact.postanski_broj,
      },
    };

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      source: "storefront",
      type: "webshop",
      config,
      items,
      price: subtotal,
      fabric_id: null,
      contact,
      note: contact.napomena || null,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    if (!supabase) {
      const orders = await readOrdersFile();
      orders.unshift(entry);
      await writeOrdersFile(orders);
      await decrementStockForItems(items, null);
      return NextResponse.json({ success: true, orderId: entry.id, storage: "file" });
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        config,
        price: subtotal,
        fabric_id: null,
        contact,
        note: contact.napomena || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    await decrementStockForItems(items, supabase);
    return NextResponse.json({ success: true, orderId: data?.id });
  }

  if (!payload.config) {
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
  }

  const { config, price, fabricId, contact, note, status } = payload;
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    config,
    price: price ?? null,
    fabric_id: fabricId ?? null,
    contact: contact ?? null,
    note: note ?? null,
    status: status ?? "draft",
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    const orders = await readOrdersFile();
    orders.unshift(entry);
    await writeOrdersFile(orders);
    return NextResponse.json({ success: true, orderId: entry.id, storage: "file" });
  }
  const { data, error } = await supabase
    .from("orders")
    .insert({
      config,
      price: price ?? null,
      fabric_id: fabricId ?? null,
      contact: contact ?? null,
      note: note ?? null,
      status: status ?? "draft",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: data?.id });
}

export async function GET(req: NextRequest) {
  const authError = requireAdmin(req);
  if (authError) return authError;

  const supabase = getServiceSupabase();
  if (!supabase) {
    const orders = await readOrdersFile();
    const sorted = [...orders]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 200);
    return NextResponse.json({ success: true, data: sorted, storage: "file" });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = getServiceSupabase();
  const payload = await req.json().catch(() => null);
  const isPublicUpdate = payload?.status === "pending" && payload?.contact;
  if (!isPublicUpdate) {
    const authError = requireAdmin(req);
    if (authError) return authError;
  }
  const id = payload?.id;
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing id" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  if (payload?.status) updates.status = payload.status;
  if ("contact" in payload) updates.contact = payload.contact ?? null;
  if ("note" in payload) updates.note = payload.note ?? null;
  if ("config" in payload) updates.config = payload.config ?? null;
  if ("price" in payload) updates.price = payload.price ?? null;
  if ("fabricId" in payload) updates.fabric_id = payload.fabricId ?? null;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ success: false, message: "No updates provided" }, { status: 400 });
  }

  if (!supabase) {
    const orders = await readOrdersFile();
    const index = orders.findIndex((order) => order.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }
    orders[index] = { ...orders[index], ...updates, updated_at: new Date().toISOString() };
    await writeOrdersFile(orders);
    return NextResponse.json({ success: true, orderId: id, storage: "file" });
  }

  const { error } = await supabase.from("orders").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
