import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/server";
import { invalidateCatalogCaches } from "@/lib/catalog/store";

const MOFFICE_API_URL = "https://api.moffice.co.rs/api/LagerTekstil";

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanName(name: string): string {
  const parts = name.trim().split(/\s{2,}/);
  return (parts[0] ?? name).trim();
}

type MofficeItem = {
  ARTIKAL_ID?: number;
  ARTIKAL_SIFRA?: string;
  ARTIKAL_BARKOD?: string;
  ARTIKAL_NAZIV?: string;
  ARTIKAL_MP_CENA?: number;
  ARTIKAL_VP_CENA?: number;
  ARTIKAL_PDV_STOPA?: number;
  ARTIKAL_ZALIHE?: number;
  ARTIKAL_GRUPA?: string;
  ARTIKAL_VELICINA?: string;
};

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.MOFFICE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "MOFFICE_API_KEY not set" }, { status: 500 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "No Supabase service client" }, { status: 500 });
  }

  const started = Date.now();

  // 1. Fetch from mOffice
  let items: MofficeItem[];
  try {
    const res = await fetch(MOFFICE_API_URL, {
      headers: { "X-API-KEY": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `mOffice API returned ${res.status}` }, { status: 502 });
    }
    items = await res.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "mOffice returned invalid response" }, { status: 502 });
    }
  } catch (err) {
    return NextResponse.json({ error: `mOffice fetch failed: ${err}` }, { status: 502 });
  }

  // 2. Load existing products by EAN and SKU for matching
  type ExistingRow = { legacy_id: number; sku: string; ean: string; name_sr: string; raw_payload: Record<string, unknown> };
  const { data: existingRaw } = await supabase
    .from("catalog_products")
    .select("legacy_id,sku,ean,name_sr,raw_payload");
  const existing = (existingRaw ?? []) as unknown as ExistingRow[];

  const byEan = new Map<string, ExistingRow>();
  const bySku = new Map<string, ExistingRow>();
  for (const row of existing) {
    const ean = normalizeKey(row.ean);
    const sku = normalizeKey(row.sku);
    if (ean) byEan.set(ean, row);
    if (sku) bySku.set(sku, row);
  }

  // 3. Build upsert rows
  const rowsById = new Map<number, Record<string, unknown>>();
  const duplicatesToDisable: number[] = [];
  let matched = 0;
  let created = 0;

  for (const item of items) {
    const mofficeId = Number(item.ARTIKAL_ID ?? 0);
    if (!mofficeId) continue;

    const sku = normalizeKey(item.ARTIKAL_SIFRA);
    const ean = normalizeKey(item.ARTIKAL_BARKOD);
    const existingRow =
      (ean && byEan.get(ean)) ?? (sku && bySku.get(sku)) ?? null;

    const name = cleanName(String(item.ARTIKAL_NAZIV ?? ""));
    const mpPrice = Number(item.ARTIKAL_MP_CENA ?? 0);
    const vpPrice = Number(item.ARTIKAL_VP_CENA ?? 0);
    const tax = Number(item.ARTIKAL_PDV_STOPA ?? 20);
    const stock = Math.max(0, Number(item.ARTIKAL_ZALIHE ?? 0));
    const legacyId = existingRow ? existingRow.legacy_id : mofficeId;

    const existingPayload = existingRow && typeof existingRow === "object" ? (existingRow.raw_payload ?? {}) : {};
    const payload: Record<string, unknown> = {
      ...existingPayload,
      moffice: {
        id: mofficeId,
        category: item.ARTIKAL_GRUPA ?? "",
        size: item.ARTIKAL_VELICINA ?? "",
        synced_at: new Date().toISOString(),
      },
    };
    if (!existingRow) {
      payload.source = "moffice";
      payload.category = item.ARTIKAL_GRUPA ?? "";
      payload.size = item.ARTIKAL_VELICINA ?? "";
    }

    if (existingRow) {
      matched++;
      if (mofficeId !== legacyId) duplicatesToDisable.push(mofficeId);
    } else {
      created++;
    }

    rowsById.set(legacyId, {
      legacy_id: legacyId,
      sku,
      ean,
      name_sr: existingRow ? String(existingRow.name_sr ?? name) : name,
      price_net: Math.round(vpPrice * 100) / 100,
      price_gross: Math.round(mpPrice * 100) / 100,
      price_final_gross: Math.round(mpPrice * 100) / 100,
      tax_percent: tax,
      rebate_percent: 0,
      stock_warehouse_1: stock,
      stock_total: stock,
      is_active: stock > 0,
      is_exported: true,
      raw_payload: payload,
      updated_at: new Date().toISOString(),
    });
  }

  // 4. Upsert in batches of 100
  const rows = Array.from(rowsById.values());
  let upserted = 0;
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const table = supabase.from("catalog_products");
    // Cast needed: Supabase generated types may not match dynamic upsert shape
    const { error } = await (table.upsert as Function)(batch, { onConflict: "legacy_id", ignoreDuplicates: false });
    if (!error) upserted += batch.length;
  }

  // 5. Disable stale mOffice duplicates
  if (duplicatesToDisable.length > 0) {
    const table = supabase.from("catalog_products");
    await (table.update as Function)({ is_active: false, is_exported: false })
      .in("legacy_id", duplicatesToDisable);
  }

  // 6. Invalidate catalog caches so listing reflects new stock immediately
  invalidateCatalogCaches();

  const durationMs = Date.now() - started;
  return NextResponse.json({
    ok: true,
    total: items.length,
    upserted,
    matched,
    created,
    duplicatesDisabled: duplicatesToDisable.length,
    durationMs,
  });
}
