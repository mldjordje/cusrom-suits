import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { loadCatalogSnapshotDirect } from "@/lib/catalog/store";
import { SHARED_SNAPSHOT_CHUNK_SIZE } from "@/lib/catalog/sharedSnapshot";
import { applyPublicCache } from "@/lib/http/cache";

/**
 * Serves the catalog snapshot in CDN-cacheable chunks.
 *
 * Serverless instances read the snapshot from here instead of each fetching the
 * whole product table from Supabase on their first request. The long s-maxage is
 * the point of the route: the CDN answers nearly every call, so the database is
 * read about once per cache window no matter how many instances are running.
 *
 * Freshness does not depend on this window. Instances poll catalog_products for
 * the newest updated_at every 15s (see refreshCatalogDataVersion) and drop their
 * caches when it moves, and writes open a bypass window during which the shared
 * snapshot is skipped entirely.
 *
 * Not reachable without CATALOG_SNAPSHOT_TOKEN, and the token travels in the
 * query string on purpose: the CDN keys on the URL and serves hits without
 * running this function, so a header check would guard only the first request.
 */

export const dynamic = "force-dynamic";

/* Long enough that instance churn cannot turn into database load, short enough
   that a change made straight in the database still lands the same day. */
const SNAPSHOT_SMAXAGE_SECONDS = 900;

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const tokenMatches = (provided: string, expected: string) => {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export async function GET(request: Request) {
  const expected = String(process.env.CATALOG_SNAPSHOT_TOKEN || "").trim();
  const url = new URL(request.url);

  /* A 404 rather than a 401: an unconfigured or wrongly called endpoint should
     look like it does not exist. */
  if (!expected) return notFound();
  if (!tokenMatches(String(url.searchParams.get("token") || ""), expected)) return notFound();

  const filters = {
    activeOnly: url.searchParams.get("active") !== "0",
    exportOnly: url.searchParams.get("exported") !== "0",
  };
  const page = Math.max(0, Math.floor(Number(url.searchParams.get("page") || 0)) || 0);

  const items = await loadCatalogSnapshotDirect(filters);
  if (!items) {
    /* The database is unreadable. Never cache that, or the outage outlives it. */
    return NextResponse.json(
      { error: "Catalog unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const start = page * SHARED_SNAPSHOT_CHUNK_SIZE;
  const chunk = items.slice(start, start + SHARED_SNAPSHOT_CHUNK_SIZE);
  const hasMore = start + chunk.length < items.length;

  return applyPublicCache(
    NextResponse.json({
      page,
      pageSize: SHARED_SNAPSHOT_CHUNK_SIZE,
      total: items.length,
      items: chunk,
      hasMore,
    }),
    {
      maxAge: 0,
      sMaxAge: SNAPSHOT_SMAXAGE_SECONDS,
      staleWhileRevalidate: SNAPSHOT_SMAXAGE_SECONDS,
    },
  );
}
