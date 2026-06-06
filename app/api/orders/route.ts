import { NextRequest, NextResponse } from "next/server";
import { trackVercelServerEvent } from "@/lib/analytics/vercel";
import { isAdminRequestAuthenticated } from "@/lib/adminAuth";
import { evaluateVoucher, getFulfillmentSettings, redeemVoucher } from "@/lib/storefront/fulfillment";
import { getSiteContent } from "@/lib/storefront/siteContent";
import { getServiceSupabase } from "@/lib/supabase/server";
import { getStorefrontUserFromCookies } from "@/lib/supabase/storefront-server";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/security/rateLimit";
import { sendOrderNotifications, sendOrderStatusUpdate } from "@/lib/email/notifications";
import type { OrderEmailContext } from "@/lib/email/templates";
import { formatPublicOrderNumber, getNextPublicOrderNumber } from "@/lib/orders/publicOrderNumber";
import type { StorefrontCartItem } from "@/lib/cart/types";

const ORDERS_RATE_LIMIT = { limit: 6, windowMs: 60_000, scope: "orders" } as const;

const ORDERS_PATH = "data/orders.json";

let supabaseMissingWarned = false;
const warnSupabaseMissing = (context: string) => {
  if (supabaseMissingWarned) return;
  supabaseMissingWarned = true;
  const msg = `[orders] Supabase is not configured — falling back to data/orders.json (${context}). On Vercel this storage is EPHEMERAL and orders WILL be lost. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`;
  if (process.env.NODE_ENV === "production") {
    console.error(msg);
  } else {
    console.warn(msg);
  }
};

const requireAdmin = async (req: NextRequest) => {
  if (await isAdminRequestAuthenticated(req)) return null;
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
};

const readOrdersFile = async () => readPersistentJsonFile<any[]>(ORDERS_PATH, []);

const writeOrdersFile = async (orders: any[]) => {
  await writePersistentJsonFile(ORDERS_PATH, orders);
};

const getNextSupabasePublicOrderNumber = async (supabase: NonNullable<ReturnType<typeof getServiceSupabase>>) => {
  const { data, error } = await supabase.from("orders").select("config").limit(1000);
  if (error) throw error;
  return getNextPublicOrderNumber((data ?? []) as Array<{ config?: Record<string, unknown> | null }>);
};

const isStorefrontPayload = (payload: any): payload is {
  source?: string;
  items: StorefrontCartItem[];
  customer?: Record<string, unknown> | null;
  totals?: Record<string, unknown> | null;
  fulfillment?: Record<string, unknown> | null;
  note?: string | null;
} => Array.isArray(payload?.items) && payload.items.length > 0;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, ORDERS_RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, message: "Previse zahteva. Pokusaj ponovo za nekoliko sekundi." },
      { status: 429, headers: buildRateLimitHeaders(rate, ORDERS_RATE_LIMIT.limit) },
    );
  }
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
        size: item.size ? String(item.size) : null,
        material: item.material ? String(item.material) : null,
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
    const fulfillmentPayload =
      payload.fulfillment && typeof payload.fulfillment === "object"
        ? (payload.fulfillment as Record<string, unknown>)
        : {};
    const deliveryMethod = fulfillmentPayload.method === "pickup" ? "pickup" : "delivery";
    const deliveryServiceId = String(fulfillmentPayload.deliveryServiceId || "").trim();
    const pickupStoreSlug = String(fulfillmentPayload.pickupStoreSlug || "").trim();
    const voucherCode = String(fulfillmentPayload.voucherCode || "").trim().toUpperCase();
    const [fulfillmentSettings, siteContent] = await Promise.all([getFulfillmentSettings(), getSiteContent()]);
    const selectedDeliveryService =
      deliveryMethod === "delivery"
        ? fulfillmentSettings.deliveryServices.find((service) => service.isActive && service.id === deliveryServiceId) || null
        : null;
    const selectedPickupStore =
      deliveryMethod === "pickup"
        ? siteContent.stores.find((store) => store.slug === pickupStoreSlug) || null
        : null;

    if (deliveryMethod === "pickup" && !selectedPickupStore) {
      return NextResponse.json({ success: false, message: "Izaberi radnju za preuzimanje." }, { status: 400 });
    }
    if (deliveryMethod === "delivery" && !selectedDeliveryService) {
      return NextResponse.json({ success: false, message: "Izaberi kurirsku sluzbu." }, { status: 400 });
    }

    const deliveryCost = deliveryMethod === "delivery" ? Number(selectedDeliveryService?.price || 0) : 0;
    let voucherDiscount = 0;
    if (voucherCode) {
      const voucherResult = await evaluateVoucher({
        code: voucherCode,
        email,
        subtotal,
        deliveryCost,
      });
      if (!voucherResult.ok) {
        return NextResponse.json({ success: false, message: voucherResult.message }, { status: 400 });
      }
      voucherDiscount = voucherResult.discountAmount;
    }
    const finalTotal = Math.max(0, subtotal + deliveryCost - voucherDiscount);
    const { user: sessionUser } = await getStorefrontUserFromCookies();
    const sessionEmail = sessionUser?.email?.trim().toLowerCase() || "";
    const storefrontUserId =
      sessionUser?.id && sessionEmail && sessionEmail === email.toLowerCase() ? sessionUser.id : null;

    const contact = {
      ime: fullName,
      email,
      telefon: phone,
      adresa: String(customer.address || "").trim(),
      grad: String(customer.city || "").trim(),
      postanski_broj: String(customer.postalCode || "").trim(),
      napomena: String(customer.note || payload.note || "").trim(),
      delivery_method: deliveryMethod,
      pickup_store_slug: selectedPickupStore?.slug || null,
      pickup_store_label: selectedPickupStore?.title || null,
      delivery_service_id: selectedDeliveryService?.id || null,
      delivery_service_name: selectedDeliveryService?.name || null,
      voucher_code: voucherCode || null,
    };

    let publicOrderNumber: number;
    if (!supabase) {
      publicOrderNumber = getNextPublicOrderNumber(await readOrdersFile());
    } else {
      publicOrderNumber = await getNextSupabasePublicOrderNumber(supabase);
    }

    const config = {
      source: "storefront",
      type: "webshop",
      publicOrderNumber,
      ...(storefrontUserId ? { storefrontUserId } : {}),
      items,
      totals: {
        subtotal,
        deliveryCost,
        voucherDiscount,
        finalTotal,
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
      fulfillment: {
        method: deliveryMethod,
        pickupStoreSlug: selectedPickupStore?.slug || null,
        pickupStoreLabel: selectedPickupStore?.title || null,
        deliveryServiceId: selectedDeliveryService?.id || null,
        deliveryServiceName: selectedDeliveryService?.name || null,
        deliveryCost,
        voucherCode: voucherCode || null,
        voucherDiscount,
        finalTotal,
      },
    };

    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      source: "storefront",
      type: "webshop",
      config,
      items,
      price: finalTotal,
      fabric_id: null,
      contact,
      note: contact.napomena || null,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const buildEmailContext = (orderId: string): OrderEmailContext => ({
      orderId: String(publicOrderNumber),
      internalOrderId: orderId,
      customer: {
        fullName,
        email,
        phone,
        address: contact.adresa || undefined,
        city: contact.grad || undefined,
        postalCode: contact.postanski_broj || undefined,
        note: contact.napomena || undefined,
      },
      fulfillment: {
        method: deliveryMethod,
        pickupStoreLabel: selectedPickupStore?.title || null,
        deliveryServiceName: selectedDeliveryService?.name || null,
        deliveryCost,
      },
      totals: {
        subtotal,
        deliveryCost,
        voucherDiscount,
        finalTotal,
      },
      voucherCode: voucherCode || null,
      items: items.map((item) => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
    });

    if (!supabase) {
      warnSupabaseMissing("storefront order");
      const orders = await readOrdersFile();
      orders.unshift(entry);
      await writeOrdersFile(orders);
      if (voucherCode) {
        await redeemVoucher(voucherCode, String(entry.id));
      }
      void trackVercelServerEvent("order_submitted", {
        source: "storefront",
        fulfillmentMethod: deliveryMethod,
        total: finalTotal,
        quantity,
        hasVoucher: voucherCode ? 1 : 0,
        storage: "file",
      });
      void sendOrderNotifications(buildEmailContext(String(entry.id))).catch((err) =>
        console.error("[orders] sendOrderNotifications failed (file fallback):", err),
      );
      return NextResponse.json({
        success: true,
        orderId: entry.id,
        orderNumber: publicOrderNumber,
        storage: "file",
        finalTotal,
        voucherCode: voucherCode || null,
      });
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        config,
        price: finalTotal,
        fabric_id: null,
        contact,
        note: contact.napomena || null,
        status: "pending",
      } as never)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const orderId = String((data as { id?: string | number } | null)?.id || "");
    if (voucherCode && orderId) {
      await redeemVoucher(voucherCode, orderId);
    }
    void trackVercelServerEvent("order_submitted", {
      source: "storefront",
      fulfillmentMethod: deliveryMethod,
      total: finalTotal,
      quantity,
      hasVoucher: voucherCode ? 1 : 0,
    });
    if (orderId) {
      void sendOrderNotifications(buildEmailContext(orderId)).catch((err) =>
        console.error("[orders] sendOrderNotifications failed:", err),
      );
    }
    return NextResponse.json({ success: true, orderId, orderNumber: publicOrderNumber, finalTotal, voucherCode: voucherCode || null });
  }

  if (!payload.config) {
    return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
  }

  const { config, price, fabricId, contact, note, status } = payload;
  let publicOrderNumber: number;
  if (!supabase) {
    publicOrderNumber = getNextPublicOrderNumber(await readOrdersFile());
  } else {
    publicOrderNumber = await getNextSupabasePublicOrderNumber(supabase);
  }
  const configWithPublicNumber = {
    ...(config && typeof config === "object" ? config : {}),
    publicOrderNumber,
  };
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    config: configWithPublicNumber,
    price: price ?? null,
    fabric_id: fabricId ?? null,
    contact: contact ?? null,
    note: note ?? null,
    status: status ?? "draft",
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    warnSupabaseMissing("custom order");
    const orders = await readOrdersFile();
    orders.unshift(entry);
    await writeOrdersFile(orders);
    return NextResponse.json({ success: true, orderId: entry.id, orderNumber: publicOrderNumber, storage: "file" });
  }
  const { data, error } = await supabase
    .from("orders")
    .insert({
      config: configWithPublicNumber,
      price: price ?? null,
      fabric_id: fabricId ?? null,
      contact: contact ?? null,
      note: note ?? null,
      status: status ?? "draft",
    } as never)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, orderId: (data as { id?: string | number } | null)?.id, orderNumber: publicOrderNumber });
}

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
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
    const authError = await requireAdmin(req);
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

  const shouldNotifyCustomer =
    !isPublicUpdate &&
    typeof payload?.status === "string" &&
    payload.notifyCustomer !== false &&
    ["confirmed", "completed", "cancelled"].includes(payload.status);

  let previousOrder: Record<string, any> | null = null;

  if (!supabase) {
    const orders = await readOrdersFile();
    const index = orders.findIndex((order) => order.id === id);
    if (index === -1) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }
    previousOrder = orders[index];
    orders[index] = { ...orders[index], ...updates, updated_at: new Date().toISOString() };
    await writeOrdersFile(orders);
  } else {
    if (shouldNotifyCustomer) {
      const { data: prev } = await supabase
        .from("orders")
        .select("status, contact, price, config")
        .eq("id", id)
        .maybeSingle();
      previousOrder = (prev as Record<string, any> | null) ?? null;
    }

    const { error } = await supabase.from("orders").update(updates as never).eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
  }

  if (shouldNotifyCustomer && previousOrder) {
    const contact = (previousOrder.contact as Record<string, any> | null) || null;
    const customerEmail = String(contact?.email || "").trim();
    const customerName = String(contact?.ime || contact?.name || "").trim();

    if (customerEmail) {
      void sendOrderStatusUpdate({
        orderId: formatPublicOrderNumber({ id, config: previousOrder.config || null }),
        internalOrderId: String(id),
        customerName: customerName || customerEmail,
        customerEmail,
        newStatus: payload.status,
        previousStatus: previousOrder.status || null,
        finalTotal: typeof previousOrder.price === "number" ? previousOrder.price : undefined,
        trackingNote: typeof payload.customerNote === "string" ? payload.customerNote : null,
      }).catch((err) => console.error("[orders] sendOrderStatusUpdate failed:", err));
    }
  }

  return NextResponse.json({ success: true, orderId: id, ...(supabase ? {} : { storage: "file" }) });
}
