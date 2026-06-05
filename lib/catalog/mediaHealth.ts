import { revalidateTag, unstable_cache } from "next/cache";
import { readPersistentJsonFile, writePersistentJsonFile } from "@/lib/storage/persistentJson";

const MEDIA_HEALTH_PATH = "data/media-health.json";
export const MEDIA_HEALTH_CACHE_TAG = "media-health";

export type MediaHealthDoc = {
  /** ISO timestamp of the last completed scan, or null if never scanned. */
  scannedAt: string | null;
  /** Number of products examined in the last scan. */
  totalChecked: number;
  /** Number of products with all images unreachable in the last scan. */
  brokenCount: number;
  /** Collapsed-representative legacyIds whose images are all unreachable. */
  brokenLegacyIds: number[];
};

const EMPTY_DOC: MediaHealthDoc = {
  scannedAt: null,
  totalChecked: 0,
  brokenCount: 0,
  brokenLegacyIds: [],
};

const normalizeDoc = (value: Partial<MediaHealthDoc> | null | undefined): MediaHealthDoc => {
  const brokenLegacyIds = Array.from(
    new Set(
      (Array.isArray(value?.brokenLegacyIds) ? value!.brokenLegacyIds : [])
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item)),
    ),
  );
  return {
    scannedAt: value?.scannedAt ? String(value.scannedAt) : null,
    totalChecked: Number.isFinite(Number(value?.totalChecked)) ? Number(value!.totalChecked) : 0,
    brokenCount: brokenLegacyIds.length,
    brokenLegacyIds,
  };
};

const readMediaHealthCached = unstable_cache(
  async () => normalizeDoc(await readPersistentJsonFile<MediaHealthDoc>(MEDIA_HEALTH_PATH, EMPTY_DOC)),
  ["media-health-v1"],
  { revalidate: 120, tags: [MEDIA_HEALTH_CACHE_TAG] },
);

export async function getMediaHealth(): Promise<MediaHealthDoc> {
  try {
    return await readMediaHealthCached();
  } catch {
    return EMPTY_DOC;
  }
}

/** Cheap, cached read of the broken-product id set for storefront filtering. */
export async function getBrokenProductIdSet(): Promise<Set<number>> {
  const doc = await getMediaHealth();
  return new Set(doc.brokenLegacyIds);
}

export async function saveMediaHealth(input: {
  totalChecked: number;
  brokenLegacyIds: number[];
}): Promise<MediaHealthDoc> {
  const doc = normalizeDoc({
    scannedAt: new Date().toISOString(),
    totalChecked: input.totalChecked,
    brokenLegacyIds: input.brokenLegacyIds,
  });
  await writePersistentJsonFile(MEDIA_HEALTH_PATH, doc);
  try {
    revalidateTag(MEDIA_HEALTH_CACHE_TAG);
  } catch {
    // revalidateTag is unavailable outside a request/render scope — ignore.
  }
  return doc;
}
