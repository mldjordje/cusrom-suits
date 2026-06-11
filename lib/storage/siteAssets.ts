import { getAnonSupabase, getServiceSupabase } from "@/lib/supabase/server";

export const SITE_ASSET_BUCKET = process.env.SUPABASE_SITE_ASSET_BUCKET || "site-assets";

const getBucketCache = () => {
  const globalWithCache = globalThis as typeof globalThis & {
    __siteAssetBuckets?: Map<string, boolean>;
  };

  if (!globalWithCache.__siteAssetBuckets) {
    globalWithCache.__siteAssetBuckets = new Map<string, boolean>();
  }

  return globalWithCache.__siteAssetBuckets;
};

export const normalizeSiteAssetPath = (relativePath: string) =>
  String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

export async function ensureSiteAssetBucket(bucket = SITE_ASSET_BUCKET) {
  const cache = getBucketCache();
  if (cache.get(bucket)) return true;

  const supabase = getServiceSupabase();
  if (!supabase) return false;

  try {
    const { data } = await supabase.storage.getBucket(bucket);
    if (data) {
      cache.set(bucket, true);
      return true;
    }
  } catch {
    // Continue with create attempt.
  }

  try {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: false,
    });
    if (!error) {
      cache.set(bucket, true);
      return true;
    }
  } catch {
    // Ignore and let caller handle the failure.
  }

  return false;
}

export async function uploadSiteAsset(
  storagePath: string,
  payload: ArrayBuffer | Buffer,
  contentType?: string | null,
  bucket = SITE_ASSET_BUCKET,
) {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const ready = await ensureSiteAssetBucket(bucket);
  if (!ready) return false;

  try {
    const { error } = await supabase.storage.from(bucket).upload(normalizeSiteAssetPath(storagePath), payload, {
      upsert: true,
      contentType: contentType || undefined,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function downloadSiteAsset(storagePath: string, bucket = SITE_ASSET_BUCKET) {
  const normalizedPath = normalizeSiteAssetPath(storagePath);
  const supabase = getServiceSupabase() || getAnonSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage.from(bucket).download(normalizedPath);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSignedSiteAssetUrl(
  storagePath: string,
  expiresInSeconds = 3600,
  bucket = SITE_ASSET_BUCKET,
) {
  const normalizedPath = normalizeSiteAssetPath(storagePath);
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(normalizedPath, expiresInSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
