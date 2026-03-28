import crypto from "crypto";
import { revalidateTag, unstable_cache } from "next/cache";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const FULFILLMENT_PATH = "data/fulfillment-settings.json";
const FULFILLMENT_CACHE_TAG = "fulfillment-settings";

export type DeliveryService = {
  id: string;
  code: string;
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  trackingUrl: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
};

export type Voucher = {
  id: string;
  code: string;
  email: string;
  amount: number;
  type: "fixed" | "percent";
  isActive: boolean;
  createdAt: string;
  usedAt: string | null;
  usedOrderId: string | null;
};

export type FulfillmentSettings = {
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  pickupLabel: string;
  pickupLabelEn: string;
  deliveryLabel: string;
  deliveryLabelEn: string;
  pickupNote: string;
  pickupNoteEn: string;
  deliveryNote: string;
  deliveryNoteEn: string;
  deliveryServices: DeliveryService[];
  vouchers: Voucher[];
};

export type VoucherEvaluation =
  | { ok: true; voucher: Voucher; discountAmount: number }
  | { ok: false; message: string };

export const DEFAULT_FULFILLMENT_SETTINGS: FulfillmentSettings = {
  pickupEnabled: true,
  deliveryEnabled: true,
  pickupLabel: "Preuzimanje u radnji",
  pickupLabelEn: "Store pickup",
  deliveryLabel: "Dostava kurirskom sluzbom",
  deliveryLabelEn: "Courier delivery",
  pickupNote: "Tim potvrdjuje radnju i vreme preuzimanja nakon porudzbine.",
  pickupNoteEn: "The team confirms the store and pickup timing after the order is sent.",
  deliveryNote: "Dostava i konacan trosak se potvrdjuju direktno sa kupcem.",
  deliveryNoteEn: "Delivery details and the final shipping cost are confirmed directly with the customer.",
  deliveryServices: [
    {
      id: "city-express",
      code: "CITY EXPRESS",
      name: "CITY EXPRESS",
      description: "Kurirska sluzba iz starog webshop sistema.",
      phone: "+381 11 30 93 000",
      email: "",
      website: "https://www.cityexpress.rs/",
      trackingUrl: "",
      price: 0,
      sortOrder: 0,
      isActive: true,
    },
  ],
  vouchers: [],
};

const normalizeText = (value: unknown, fallback = "") => String(value || fallback || "").trim();
const normalizeCode = (value: unknown) => normalizeText(value).toUpperCase();
const normalizeNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeDeliveryServices = (value: unknown, fallback: DeliveryService[]) => {
  if (!Array.isArray(value)) return fallback;
  const services = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id) || crypto.randomUUID();
      const code = normalizeCode(row.code);
      const name = normalizeText(row.name);
      if (!id || !code || !name) return null;
      return {
        id,
        code,
        name,
        description: normalizeText(row.description),
        phone: normalizeText(row.phone),
        email: normalizeText(row.email),
        website: normalizeText(row.website),
        trackingUrl: normalizeText(row.trackingUrl),
        price: Math.max(0, normalizeNumber(row.price, 0)),
        sortOrder: normalizeNumber(row.sortOrder, 0),
        isActive: row.isActive !== false,
      };
    })
    .filter((item): item is DeliveryService => Boolean(item))
    .slice(0, 24)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "sr"));
  return services.length ? services : fallback;
};

const normalizeVouchers = (value: unknown) => {
  if (!Array.isArray(value)) return [] as Voucher[];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = normalizeText(row.id) || crypto.randomUUID();
      const code = normalizeCode(row.code);
      const type = row.type === "percent" ? "percent" : "fixed";
      const amount = Math.max(0, normalizeNumber(row.amount, 0));
      if (!id || !code || amount <= 0) return null;
      return {
        id,
        code,
        email: normalizeText(row.email).toLowerCase(),
        amount,
        type,
        isActive: row.isActive !== false,
        createdAt: normalizeText(row.createdAt) || new Date().toISOString(),
        usedAt: normalizeText(row.usedAt) || null,
        usedOrderId: normalizeText(row.usedOrderId) || null,
      };
    })
    .filter((item): item is Voucher => Boolean(item))
    .slice(0, 200);
};

async function readFulfillmentUncached(): Promise<FulfillmentSettings> {
  const raw = await readPersistentJsonFile<Partial<FulfillmentSettings>>(FULFILLMENT_PATH, {});
  return {
    pickupEnabled: raw.pickupEnabled !== false,
    deliveryEnabled: raw.deliveryEnabled !== false,
    pickupLabel: normalizeText(raw.pickupLabel, DEFAULT_FULFILLMENT_SETTINGS.pickupLabel),
    pickupLabelEn: normalizeText(raw.pickupLabelEn, DEFAULT_FULFILLMENT_SETTINGS.pickupLabelEn),
    deliveryLabel: normalizeText(raw.deliveryLabel, DEFAULT_FULFILLMENT_SETTINGS.deliveryLabel),
    deliveryLabelEn: normalizeText(raw.deliveryLabelEn, DEFAULT_FULFILLMENT_SETTINGS.deliveryLabelEn),
    pickupNote: normalizeText(raw.pickupNote, DEFAULT_FULFILLMENT_SETTINGS.pickupNote),
    pickupNoteEn: normalizeText(raw.pickupNoteEn, DEFAULT_FULFILLMENT_SETTINGS.pickupNoteEn),
    deliveryNote: normalizeText(raw.deliveryNote, DEFAULT_FULFILLMENT_SETTINGS.deliveryNote),
    deliveryNoteEn: normalizeText(raw.deliveryNoteEn, DEFAULT_FULFILLMENT_SETTINGS.deliveryNoteEn),
    deliveryServices: normalizeDeliveryServices(raw.deliveryServices, DEFAULT_FULFILLMENT_SETTINGS.deliveryServices),
    vouchers: normalizeVouchers(raw.vouchers),
  };
}

const getFulfillmentCached = unstable_cache(async () => readFulfillmentUncached(), ["fulfillment-v1"], {
  revalidate: 300,
  tags: [FULFILLMENT_CACHE_TAG],
});

export async function getFulfillmentSettings(): Promise<FulfillmentSettings> {
  return getFulfillmentCached();
}

export async function updateFulfillmentSettings(patch: Partial<FulfillmentSettings>): Promise<FulfillmentSettings> {
  const current = await getFulfillmentSettings();
  const next: FulfillmentSettings = {
    pickupEnabled: patch.pickupEnabled == null ? current.pickupEnabled : Boolean(patch.pickupEnabled),
    deliveryEnabled: patch.deliveryEnabled == null ? current.deliveryEnabled : Boolean(patch.deliveryEnabled),
    pickupLabel: patch.pickupLabel == null ? current.pickupLabel : normalizeText(patch.pickupLabel, current.pickupLabel),
    pickupLabelEn: patch.pickupLabelEn == null ? current.pickupLabelEn : normalizeText(patch.pickupLabelEn, current.pickupLabelEn),
    deliveryLabel: patch.deliveryLabel == null ? current.deliveryLabel : normalizeText(patch.deliveryLabel, current.deliveryLabel),
    deliveryLabelEn: patch.deliveryLabelEn == null ? current.deliveryLabelEn : normalizeText(patch.deliveryLabelEn, current.deliveryLabelEn),
    pickupNote: patch.pickupNote == null ? current.pickupNote : normalizeText(patch.pickupNote, current.pickupNote),
    pickupNoteEn: patch.pickupNoteEn == null ? current.pickupNoteEn : normalizeText(patch.pickupNoteEn, current.pickupNoteEn),
    deliveryNote: patch.deliveryNote == null ? current.deliveryNote : normalizeText(patch.deliveryNote, current.deliveryNote),
    deliveryNoteEn: patch.deliveryNoteEn == null ? current.deliveryNoteEn : normalizeText(patch.deliveryNoteEn, current.deliveryNoteEn),
    deliveryServices: patch.deliveryServices == null ? current.deliveryServices : normalizeDeliveryServices(patch.deliveryServices, current.deliveryServices),
    vouchers: patch.vouchers == null ? current.vouchers : normalizeVouchers(patch.vouchers),
  };
  await writePersistentJsonFile(FULFILLMENT_PATH, next);
  revalidateTag(FULFILLMENT_CACHE_TAG);
  return next;
}

export async function evaluateVoucher(params: {
  code: string;
  email: string;
  subtotal: number;
  deliveryCost: number;
}): Promise<VoucherEvaluation> {
  const code = normalizeCode(params.code);
  if (!code) {
    return { ok: false, message: "Unesi vaucer kod." };
  }
  const settings = await getFulfillmentSettings();
  const voucher = settings.vouchers.find((item) => item.code === code);
  if (!voucher || !voucher.isActive) {
    return { ok: false, message: "Vaucer nije pronadjen ili nije aktivan." };
  }
  if (voucher.usedAt || voucher.usedOrderId) {
    return { ok: false, message: "Vaucer je vec iskoriscen." };
  }
  const email = normalizeText(params.email).toLowerCase();
  if (voucher.email && email && voucher.email !== email) {
    return { ok: false, message: "Vaucer je vezan za drugi email." };
  }
  const base = Math.max(0, Number(params.subtotal || 0) + Number(params.deliveryCost || 0));
  const discountAmount =
    voucher.type === "percent"
      ? Math.min(base, Number(((base * voucher.amount) / 100).toFixed(2)))
      : Math.min(base, voucher.amount);
  if (discountAmount <= 0) {
    return { ok: false, message: "Vaucer nema vazecu vrednost." };
  }
  return { ok: true, voucher, discountAmount };
}

export async function redeemVoucher(code: string, orderId: string) {
  const settings = await getFulfillmentSettings();
  const normalized = normalizeCode(code);
  const next = settings.vouchers.map((voucher) =>
    voucher.code === normalized
      ? { ...voucher, usedAt: new Date().toISOString(), usedOrderId: orderId || voucher.usedOrderId }
      : voucher,
  );
  await updateFulfillmentSettings({ vouchers: next });
}
