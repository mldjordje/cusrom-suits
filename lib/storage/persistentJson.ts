import { getServiceSupabase } from "@/lib/supabase/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";

const PERSISTENT_JSON_BUCKET = process.env.SUPABASE_CONFIG_BUCKET || "site-config";

const getPersistentStorageCache = () => {
  const globalWithCache = globalThis as typeof globalThis & {
    __persistentJsonBuckets?: Map<string, boolean>;
  };

  if (!globalWithCache.__persistentJsonBuckets) {
    globalWithCache.__persistentJsonBuckets = new Map<string, boolean>();
  }

  return globalWithCache.__persistentJsonBuckets;
};

const normalizeStoragePath = (relativePath: string) =>
  String(relativePath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();

const ensureBucket = async (bucket: string) => {
  const cache = getPersistentStorageCache();
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
    // Ignore and let caller fall back.
  }

  return false;
};

async function readFromSupabase<T>(bucket: string, storagePath: string): Promise<T | null> {
  const supabase = getServiceSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.storage.from(bucket).download(storagePath);
    if (error || !data) return null;
    return JSON.parse(await data.text()) as T;
  } catch {
    return null;
  }
}

async function writeToSupabase(bucket: string, storagePath: string, data: unknown) {
  const supabase = getServiceSupabase();
  if (!supabase) return false;

  const ready = await ensureBucket(bucket);
  if (!ready) return false;

  try {
    const payload = Buffer.from(JSON.stringify(data, null, 2), "utf8");
    const { error } = await supabase.storage.from(bucket).upload(storagePath, payload, {
      upsert: true,
      contentType: "application/json; charset=utf-8",
    });
    return !error;
  } catch {
    return false;
  }
}

export async function readPersistentJsonFile<T>(
  relativePath: string,
  fallback: T,
  options?: { storagePath?: string; bucket?: string },
): Promise<T> {
  const bucket = options?.bucket || PERSISTENT_JSON_BUCKET;
  const storagePath = normalizeStoragePath(options?.storagePath || relativePath);
  const stored = await readFromSupabase<T>(bucket, storagePath);
  if (stored != null) return stored;

  // Supabase unavailable or file not found — read from local file only.
  // Do NOT write back to Supabase here: a transient read failure or a
  // fresh deploy with empty local files would otherwise overwrite any
  // data the admin previously saved. Writes happen only via writePersistentJsonFile.
  return readJsonFile<T>(relativePath, fallback);
}

export async function writePersistentJsonFile(
  relativePath: string,
  data: unknown,
  options?: { storagePath?: string; bucket?: string },
) {
  const bucket = options?.bucket || PERSISTENT_JSON_BUCKET;
  const storagePath = normalizeStoragePath(options?.storagePath || relativePath);
  const wroteToSupabase = await writeToSupabase(bucket, storagePath, data);

  try {
    await writeJsonFile(relativePath, data);
  } catch (error) {
    if (!wroteToSupabase) throw error;
  }
}
