import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  getFulfillmentSettings,
  updateFulfillmentSettings,
  type DeliveryService,
  type FulfillmentSettings,
  type Voucher,
} from "@/lib/storefront/fulfillment";

type FulfillmentPatch = Partial<FulfillmentSettings>;

const parseServices = (value: unknown): DeliveryService[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const code = String(row.code || "").trim();
      const name = String(row.name || "").trim();
      if (!id || !code || !name) return null;
      return {
        id,
        code,
        name,
        description: String(row.description || "").trim(),
        phone: String(row.phone || "").trim(),
        email: String(row.email || "").trim(),
        website: String(row.website || "").trim(),
        trackingUrl: String(row.trackingUrl || "").trim(),
        price: Number(row.price || 0),
        sortOrder: Number(row.sortOrder || 0),
        isActive: row.isActive !== false,
      };
    })
    .filter((item): item is DeliveryService => Boolean(item))
    .slice(0, 24);
};

const parseVouchers = (value: unknown): Voucher[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const code = String(row.code || "").trim().toUpperCase();
      const amount = Number(row.amount || 0);
      if (!id || !code || !Number.isFinite(amount) || amount <= 0) return null;
      return {
        id,
        code,
        email: String(row.email || "").trim().toLowerCase(),
        amount,
        type: row.type === "percent" ? "percent" : "fixed",
        isActive: row.isActive !== false,
        createdAt: String(row.createdAt || "").trim() || new Date().toISOString(),
        usedAt: String(row.usedAt || "").trim() || null,
        usedOrderId: String(row.usedOrderId || "").trim() || null,
      };
    })
    .filter((item): item is Voucher => Boolean(item))
    .slice(0, 200);
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const settings = await getFulfillmentSettings();
  return NextResponse.json({ success: true, settings });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }

  const row = payload as Record<string, unknown>;
  const patch: FulfillmentPatch = {};
  if ("pickupEnabled" in row) patch.pickupEnabled = Boolean(row.pickupEnabled);
  if ("deliveryEnabled" in row) patch.deliveryEnabled = Boolean(row.deliveryEnabled);
  if ("pickupLabel" in row) patch.pickupLabel = String(row.pickupLabel || "");
  if ("pickupLabelEn" in row) patch.pickupLabelEn = String(row.pickupLabelEn || "");
  if ("deliveryLabel" in row) patch.deliveryLabel = String(row.deliveryLabel || "");
  if ("deliveryLabelEn" in row) patch.deliveryLabelEn = String(row.deliveryLabelEn || "");
  if ("pickupNote" in row) patch.pickupNote = String(row.pickupNote || "");
  if ("pickupNoteEn" in row) patch.pickupNoteEn = String(row.pickupNoteEn || "");
  if ("deliveryNote" in row) patch.deliveryNote = String(row.deliveryNote || "");
  if ("deliveryNoteEn" in row) patch.deliveryNoteEn = String(row.deliveryNoteEn || "");
  if ("deliveryServices" in row) patch.deliveryServices = parseServices(row.deliveryServices);
  if ("vouchers" in row) patch.vouchers = parseVouchers(row.vouchers);

  const settings = await updateFulfillmentSettings(patch);
  return NextResponse.json({ success: true, settings });
}
