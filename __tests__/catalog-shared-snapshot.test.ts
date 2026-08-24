import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SHARED_SNAPSHOT_CHUNK_SIZE,
  buildSharedSnapshotUrl,
  fetchSharedCatalogSnapshot,
  isSharedSnapshotEnabled,
  parseSharedSnapshotChunk,
} from "@/lib/catalog/sharedSnapshot";

/* The shared snapshot exists to keep Supabase egress off the cold-start path. It
   is only ever an optimisation: every failure mode here must end in null so the
   caller reads the database instead of serving a short or empty catalog. */

const FILTERS = { activeOnly: true, exportOnly: true };
const TOKEN = "test-token-value";
const BASE = "https://www.santos.rs";

const product = (legacyId: number) => ({ legacyId, sku: `SKU-${legacyId}` });

const chunkResponse = (body: unknown, init: { status?: number } = {}) =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json" },
  });

let originalToken: string | undefined;
let originalBase: string | undefined;

beforeEach(() => {
  originalToken = process.env.CATALOG_SNAPSHOT_TOKEN;
  originalBase = process.env.CATALOG_SNAPSHOT_BASE_URL;
  process.env.CATALOG_SNAPSHOT_TOKEN = TOKEN;
  process.env.CATALOG_SNAPSHOT_BASE_URL = BASE;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  if (originalToken === undefined) delete process.env.CATALOG_SNAPSHOT_TOKEN;
  else process.env.CATALOG_SNAPSHOT_TOKEN = originalToken;
  if (originalBase === undefined) delete process.env.CATALOG_SNAPSHOT_BASE_URL;
  else process.env.CATALOG_SNAPSHOT_BASE_URL = originalBase;
  vi.restoreAllMocks();
});

describe("configuration", () => {
  it("is off until a token is set", () => {
    delete process.env.CATALOG_SNAPSHOT_TOKEN;
    expect(isSharedSnapshotEnabled()).toBe(false);
  });

  it("is off without a base url to call", () => {
    delete process.env.CATALOG_SNAPSHOT_BASE_URL;
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const previousVercelUrl = process.env.VERCEL_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;

    expect(isSharedSnapshotEnabled()).toBe(false);

    if (previousSiteUrl !== undefined) process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    if (previousVercelUrl !== undefined) process.env.VERCEL_URL = previousVercelUrl;
  });

  it("is on once both are set", () => {
    expect(isSharedSnapshotEnabled()).toBe(true);
  });
});

describe("buildSharedSnapshotUrl", () => {
  it("carries the token in the query string, not a header", () => {
    /* The CDN serves cache hits without running the route, so a header the route
       checks would protect only the first request. */
    const url = new URL(buildSharedSnapshotUrl(FILTERS, 0));
    expect(url.searchParams.get("token")).toBe(TOKEN);
  });

  it("keys each filter combination and page separately", () => {
    const first = new URL(buildSharedSnapshotUrl(FILTERS, 0));
    const second = new URL(buildSharedSnapshotUrl({ activeOnly: false, exportOnly: false }, 2));

    expect(first.searchParams.get("active")).toBe("1");
    expect(first.searchParams.get("exported")).toBe("1");
    expect(first.searchParams.get("page")).toBe("0");
    expect(second.searchParams.get("active")).toBe("0");
    expect(second.searchParams.get("exported")).toBe("0");
    expect(second.searchParams.get("page")).toBe("2");
  });
});

describe("parseSharedSnapshotChunk", () => {
  it("accepts a well-formed chunk", () => {
    const parsed = parseSharedSnapshotChunk({ page: 0, pageSize: 800, items: [], hasMore: false });
    expect(parsed).toEqual({ page: 0, pageSize: 800, items: [], hasMore: false });
  });

  it.each([
    ["null", null],
    ["a string (an HTML error page)", "<html>502</html>"],
    ["a body with no items array", { page: 0, pageSize: 800, hasMore: false }],
    ["a body with no hasMore flag", { page: 0, pageSize: 800, items: [] }],
    ["a body with a non-numeric page", { page: "x", pageSize: 800, items: [], hasMore: false }],
  ])("rejects %s", (_label, body) => {
    expect(parseSharedSnapshotChunk(body)).toBeNull();
  });
});

describe("fetchSharedCatalogSnapshot", () => {
  it("does not call out at all when disabled", async () => {
    delete process.env.CATALOG_SNAPSHOT_TOKEN;
    const fetchMock = vi.spyOn(globalThis, "fetch");

    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stitches the chunks together in order", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      if (page === 0) {
        return chunkResponse({ page, pageSize: 2, items: [product(1), product(2)], hasMore: true });
      }
      return chunkResponse({ page, pageSize: 2, items: [product(3)], hasMore: false });
    });

    const items = await fetchSharedCatalogSnapshot(FILTERS);
    expect(items?.map((item) => (item as { legacyId: number }).legacyId)).toEqual([1, 2, 3]);
  });

  it("stops asking once a chunk says there is no more", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(chunkResponse({ page: 0, pageSize: 800, items: [product(1)], hasMore: false }));

    await fetchSharedCatalogSnapshot(FILTERS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up on a failed response instead of returning a short catalog", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      if (page === 0) {
        return chunkResponse({ page, pageSize: 2, items: [product(1)], hasMore: true });
      }
      return chunkResponse({ error: "Catalog unavailable" }, { status: 503 });
    });

    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
  });

  it("gives up when the body is not a snapshot chunk", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>gateway timeout</html>", { status: 200 }),
    );

    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
  });

  it("gives up when the request throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ETIMEDOUT"));
    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
  });

  it("gives up when a chunk is implausibly large", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ page: 0, pageSize: 800, items: [], hasMore: false }), {
        status: 200,
        headers: { "content-type": "application/json", "content-length": String(64 * 1024 * 1024) },
      }),
    );

    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
  });

  it("gives up rather than looping forever on a chunk that always wants more", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      chunkResponse({ page: 0, pageSize: 1, items: [product(1)], hasMore: true }),
    );

    expect(await fetchSharedCatalogSnapshot(FILTERS)).toBeNull();
  });

  it("bypasses Next's own fetch cache so the CDN layer is the one in charge", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(chunkResponse({ page: 0, pageSize: 800, items: [], hasMore: false }));

    await fetchSharedCatalogSnapshot(FILTERS);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ cache: "no-store" });
  });
});

describe("chunk size", () => {
  it("stays well inside the serverless response body cap", () => {
    /* Vercel caps a function response at 4.5MB; chunking is the only reason a
       multi-thousand-product catalog fits through this route at all. */
    expect(SHARED_SNAPSHOT_CHUNK_SIZE).toBeGreaterThan(0);
    expect(SHARED_SNAPSHOT_CHUNK_SIZE).toBeLessThanOrEqual(1000);
  });
});
