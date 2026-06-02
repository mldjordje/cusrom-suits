/**
 * One-time migration: populate catalog_product_media for active products
 * using image URLs from data/legacy-products.json.
 *
 * Run: npx tsx scripts/migrate-media-to-active.ts
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type LegacyProduct = {
  legacyId: number;
  coverImage?: string | null;
  images?: string[];
};

async function run() {
  console.log("Loading legacy-products.json...");
  const jsonPath = path.join(process.cwd(), "data", "legacy-products.json");
  const raw = fs.readFileSync(jsonPath, "utf8");
  const items: LegacyProduct[] = JSON.parse(raw);

  // Build map: legacyId -> image URLs
  const imagesByLegacyId = new Map<number, string[]>();
  for (const item of items) {
    const urls: string[] = [];
    if (item.coverImage?.trim()) urls.push(item.coverImage.trim());
    for (const img of item.images ?? []) {
      if (img?.trim() && !urls.includes(img.trim())) urls.push(img.trim());
    }
    if (urls.length > 0) imagesByLegacyId.set(item.legacyId, urls);
  }
  console.log(`Products with images in JSON: ${imagesByLegacyId.size}`);

  // Find active products that already have media (skip them)
  console.log("Fetching active products with existing media...");
  const { data: existingMedia } = await supabase
    .from("catalog_product_media")
    .select("legacy_product_id");
  const hasMedia = new Set((existingMedia ?? []).map((r: { legacy_product_id: number }) => r.legacy_product_id));
  console.log(`Products already with media: ${hasMedia.size}`);

  // Find active products needing images
  let needsImages: { legacy_id: number }[] = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from("catalog_products")
      .select("legacy_id")
      .eq("is_active", true)
      .eq("is_exported", true)
      .range(offset, offset + 999);
    if (!data || data.length === 0) break;
    needsImages.push(...(data as { legacy_id: number }[]).filter(r => !hasMedia.has(r.legacy_id)));
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Active products needing images: ${needsImages.length}`);

  // Build media rows from JSON data
  const mediaRows: { legacy_product_id: number; url: string; sort: number; is_cover: boolean }[] = [];
  let matched = 0;
  for (const { legacy_id } of needsImages) {
    const urls = imagesByLegacyId.get(legacy_id);
    if (!urls) continue;
    matched++;
    urls.slice(0, 10).forEach((url, i) =>
      mediaRows.push({ legacy_product_id: legacy_id, url, sort: i, is_cover: i === 0 })
    );
  }
  console.log(`Matched ${matched} products, ${mediaRows.length} media rows to insert`);

  if (mediaRows.length === 0) {
    console.log("Nothing to insert.");
    return;
  }

  // Insert in batches
  let inserted = 0;
  const CHUNK = 200;
  for (let i = 0; i < mediaRows.length; i += CHUNK) {
    const batch = mediaRows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("catalog_product_media")
      .upsert(batch, { onConflict: "legacy_product_id,url", ignoreDuplicates: true });
    if (error) console.error("Batch error:", error.message);
    else inserted += batch.length;
    process.stdout.write(`\r${inserted}/${mediaRows.length} rows inserted...`);
  }
  console.log(`\nDone. Inserted ${inserted} media rows for ${matched} active products.`);
}

run().catch(console.error);
