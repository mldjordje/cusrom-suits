/**
 * Shared catalog snapshot.
 *
 * The catalog snapshot is the whole product table. Every serverless instance used
 * to fetch it from Supabase on its first request, so the database paid for the
 * full catalog once per cold start — the reason this project blew through its
 * egress quota and had the shop serving zero products.
 *
 * This module lets instances read the snapshot from our own cached endpoint
 * instead. /api/internal/catalog-snapshot answers with a long s-maxage, so the
 * Vercel CDN serves nearly every one of those reads and Supabase sees roughly one
 * fetch per cache window instead of one per instance.
 *
 * It is off unless CATALOG_SNAPSHOT_TOKEN is set. When it is off, or when
 * anything about the fetch goes wrong, callers fall back to reading Supabase
 * directly — the shared snapshot can only save egress, never be the reason the
 * catalog fails to load.
 */

import type { CatalogProductView } from "@/lib/catalog/store";

/* The response body of a Vercel serverless function is capped (4.5 MB at the time
   of writing), and a catalog of a few thousand products serialises past that in
   one piece. The snapshot therefore travels in chunks, each comfortably inside
   the cap and cached separately by the CDN. */
export const SHARED_SNAPSHOT_CHUNK_SIZE = 800;

/* Refuse a chunk that is implausibly large rather than buffering it: something
   changed shape and we would rather fall back to Supabase than eat memory. */
const MAX_CHUNK_BYTES = 12 * 1024 * 1024;
const MAX_CHUNKS = 60;
const FETCH_TIMEOUT_MS = 8_000;

export type SharedSnapshotChunk = {
  page: number;
  pageSize: number;
  items: CatalogProductView[];
  hasMore: boolean;
};

export type SharedSnapshotFilters = {
  activeOnly: boolean;
  exportOnly: boolean;
};

const readToken = () => String(process.env.CATALOG_SNAPSHOT_TOKEN || "").trim();

/**
 * Base URL the instance uses to call itself. NEXT_PUBLIC_SITE_URL is preferred
 * because it is the host the CDN caches under; VERCEL_URL is the per-deployment
 * fallback, which still works but caches per deployment.
 */
export const getSharedSnapshotBaseUrl = () => {
  const configured = String(process.env.CATALOG_SNAPSHOT_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercelUrl = String(process.env.VERCEL_URL || "").trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;
  return "";
};

export const isSharedSnapshotEnabled = () => Boolean(readToken() && getSharedSnapshotBaseUrl());

/**
 * The token rides in the query string, not a header: the CDN keys its cache on
 * the URL and serves hits without running the function, so a header the function
 * checks would be no protection at all once a response is cached.
 */
export const buildSharedSnapshotUrl = (
  filters: SharedSnapshotFilters,
  page: number,
  options: { baseUrl?: string; token?: string } = {},
) => {
  const baseUrl = options.baseUrl ?? getSharedSnapshotBaseUrl();
  const token = options.token ?? readToken();
  const params = new URLSearchParams({
    token,
    active: filters.activeOnly ? "1" : "0",
    exported: filters.exportOnly ? "1" : "0",
    page: String(Math.max(0, Math.floor(page))),
  });
  return `${baseUrl}/api/internal/catalog-snapshot?${params.toString()}`;
};

/** Shape check on the parsed body — a CDN or proxy error page must not be read as an empty catalog. */
export const parseSharedSnapshotChunk = (body: unknown): SharedSnapshotChunk | null => {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.items)) return null;
  if (typeof record.hasMore !== "boolean") return null;
  const page = Number(record.page);
  const pageSize = Number(record.pageSize);
  if (!Number.isFinite(page) || !Number.isFinite(pageSize)) return null;
  return {
    page,
    pageSize,
    items: record.items as CatalogProductView[],
    hasMore: record.hasMore,
  };
};

/**
 * Reads the whole snapshot through the cached endpoint.
 * Returns null on any problem so the caller goes to Supabase instead.
 */
export async function fetchSharedCatalogSnapshot(
  filters: SharedSnapshotFilters,
): Promise<CatalogProductView[] | null> {
  if (!isSharedSnapshotEnabled()) return null;

  const items: CatalogProductView[] = [];

  for (let page = 0; page < MAX_CHUNKS; page += 1) {
    let chunk: SharedSnapshotChunk | null = null;

    try {
      const response = await fetch(buildSharedSnapshotUrl(filters, page), {
        /* Next would otherwise apply its own caching to this fetch on top of the
           CDN's, which is the layer we actually want in charge. */
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        console.warn(`[catalog] shared snapshot chunk ${page} returned ${response.status}`);
        return null;
      }

      const length = Number(response.headers.get("content-length") || 0);
      if (Number.isFinite(length) && length > MAX_CHUNK_BYTES) {
        console.warn(`[catalog] shared snapshot chunk ${page} too large (${length} bytes)`);
        return null;
      }

      chunk = parseSharedSnapshotChunk(await response.json());
    } catch (error) {
      console.warn(
        `[catalog] shared snapshot chunk ${page} failed:`,
        error instanceof Error ? error.message : error,
      );
      return null;
    }

    if (!chunk) {
      console.warn(`[catalog] shared snapshot chunk ${page} had an unexpected shape`);
      return null;
    }

    items.push(...chunk.items);
    if (!chunk.hasMore) return items;
  }

  /* Ran out of chunks before the endpoint said it was done: the catalog outgrew
     MAX_CHUNKS, and half a catalog is worse than a slower one. */
  console.warn(`[catalog] shared snapshot exceeded ${MAX_CHUNKS} chunks; falling back to Supabase`);
  return null;
}
