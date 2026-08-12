import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { getServiceSupabase } from "@/lib/supabase/server";
import { invalidateCatalogCaches } from "@/lib/catalog/store";

/**
 * Bulk "hide from the customer shop" switch.
 *
 * The storefront hide is SKU-level (see `listCatalogProducts` in lib/catalog/store.ts:
 * a SKU disappears when ANY of its size variants carries `raw_payload.hiddenFromShop`),
 * so this route flags EVERY row that shares the SKU. Flagging only the collapsed
 * representative would hide the product on the site but leave the admin list showing
 * a different, unflagged variant as "visible".
 *
 * Accepts free-form input: `skus` may hold mOffice sifre (SKU) or legacy IDs, both as
 * strings or numbers, one per line from the admin textarea.
 */

const CHUNK_SIZE = 25;

type VisibilityRow = {
  legacy_id: number;
  sku: string | null;
  raw_payload: Record<string, unknown> | null;
};

const parseTokens = (value: unknown) => {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[\s,;]+/) : [];
  return Array.from(
    new Set(
      list
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0),
    ),
  );
};

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const hidden = payload?.hidden === true;
  const tokens = parseTokens(payload?.skus ?? payload?.codes);
  const legacyIds = parseTokens(payload?.legacyIds)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));

  if (!tokens.length && !legacyIds.length) {
    return NextResponse.json({ success: false, message: "Nema sifri." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "Database not available" }, { status: 503 });
  }

  // mOffice sifre are stored verbatim; match the common casings so a pasted list works
  // regardless of how the client typed it.
  const skuCandidates = Array.from(
    new Set(tokens.flatMap((token) => [token, token.toUpperCase(), token.toLowerCase()])),
  );
  const numericTokens = tokens
    .map((token) => Number.parseInt(token, 10))
    .filter((item) => Number.isFinite(item));
  const idCandidates = Array.from(new Set([...legacyIds, ...numericTokens]));

  const matched = new Map<number, VisibilityRow>();

  const collect = async (column: "sku" | "legacy_id", values: Array<string | number>) => {
    if (!values.length) return null;
    const { data, error } = await supabase
      .from("catalog_products")
      .select("legacy_id, sku, raw_payload")
      .in(column, values as never[]);
    if (error) return error.message;
    for (const row of (data || []) as unknown as VisibilityRow[]) {
      matched.set(Number(row.legacy_id), row);
    }
    return null;
  };

  const skuError = await collect("sku", skuCandidates);
  if (skuError) return NextResponse.json({ success: false, message: skuError }, { status: 500 });
  const idError = await collect("legacy_id", idCandidates);
  if (idError) return NextResponse.json({ success: false, message: idError }, { status: 500 });

  // Widen the selection to every variant of every matched SKU — hiding must cover the
  // whole size run, not just the row the admin clicked.
  const skusFound = Array.from(
    new Set(
      Array.from(matched.values())
        .map((row) => String(row.sku || "").trim())
        .filter(Boolean),
    ),
  );
  const missingSkus = skusFound.filter((sku) => !skuCandidates.includes(sku));
  if (missingSkus.length) {
    const variantError = await collect("sku", missingSkus);
    if (variantError) return NextResponse.json({ success: false, message: variantError }, { status: 500 });
  }

  const rows = Array.from(matched.values());
  if (!rows.length) {
    return NextResponse.json({ success: false, message: "Nijedan artikal nije pronadjen." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const failures: string[] = [];
  let updated = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (row) => {
        const current = row.raw_payload && typeof row.raw_payload === "object" ? row.raw_payload : {};
        const nextRaw: Record<string, unknown> = { ...current };
        if (hidden) nextRaw.hiddenFromShop = true;
        else delete nextRaw.hiddenFromShop;
        const { error } = await supabase
          .from("catalog_products")
          .update({ raw_payload: nextRaw, updated_at: now } as never)
          .eq("legacy_id", row.legacy_id);
        return error ? `#${row.legacy_id}: ${error.message}` : null;
      }),
    );
    for (const result of results) {
      if (result) failures.push(result);
      else updated += 1;
    }
  }

  if (updated > 0) invalidateCatalogCaches();

  // Report which pasted codes matched nothing so the admin can fix typos.
  const matchedTokens = new Set<string>();
  for (const row of rows) {
    const sku = String(row.sku || "").trim().toUpperCase();
    if (sku) matchedTokens.add(sku);
    matchedTokens.add(String(row.legacy_id));
  }
  const notFound = tokens.filter((token) => !matchedTokens.has(token.toUpperCase()));

  return NextResponse.json({
    success: failures.length === 0,
    hidden,
    updated,
    skus: skusFound.length,
    notFound,
    errors: failures.slice(0, 10),
  });
}
