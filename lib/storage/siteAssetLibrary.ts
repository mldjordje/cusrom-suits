import fs from "fs/promises";
import path from "path";
import { getServiceSupabase } from "@/lib/supabase/server";
import { SITE_ASSET_BUCKET } from "@/lib/storage/siteAssets";

/**
 * What the admin has already uploaded, so a video can be picked instead of
 * re-uploaded.
 *
 * The upload endpoint writes to one of three places depending on how the site
 * is configured — the Supabase `site-assets` bucket, `public/site-assets/` when
 * there is no service key, or cPanel over FTP — and only the first two can be
 * listed back. FTP-hosted files are therefore recovered from the settings that
 * reference them, which covers the case that matters: a file the client already
 * put on a hero and now wants on a second one.
 */

export type SiteAssetItem = {
  url: string;
  name: string;
  kind: "image" | "video" | "other";
  sizeBytes: number | null;
  updatedAt: string | null;
  source: "storage" | "local" | "referenced";
};

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".avi", ".mpeg", ".mpg"]);
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

export const siteAssetKind = (value: string): SiteAssetItem["kind"] => {
  const ext = path.extname(String(value || "").split("?")[0]).toLowerCase();
  if (VIDEO_EXTS.has(ext)) return "video";
  if (IMAGE_EXTS.has(ext)) return "image";
  return "other";
};

/** Strips the upload prefix (`1723-uuid-`) so the list reads like file names. */
const prettyName = (fileName: string) =>
  String(fileName || "").replace(/^\d{10,}-[0-9a-f-]{36}-/i, "") || fileName;

const MAX_FOLDERS = 60;
const MAX_ITEMS = 400;

async function listFromSupabase(): Promise<SiteAssetItem[]> {
  const supabase = getServiceSupabase();
  if (!supabase) return [];

  const out: SiteAssetItem[] = [];
  try {
    const { data: folders, error } = await supabase.storage
      .from(SITE_ASSET_BUCKET)
      .list("", { limit: MAX_FOLDERS, sortBy: { column: "name", order: "desc" } });
    if (error || !folders) return [];

    for (const folder of folders) {
      if (out.length >= MAX_ITEMS) break;
      /* A row with no id is a folder placeholder; a row with one is a file
         sitting at the bucket root (older uploads did that). */
      if (folder.id) {
        out.push({
          url: `/site-assets/${folder.name}`,
          name: prettyName(folder.name),
          kind: siteAssetKind(folder.name),
          sizeBytes: Number((folder.metadata as Record<string, unknown> | null)?.size ?? 0) || null,
          updatedAt: folder.updated_at || folder.created_at || null,
          source: "storage",
        });
        continue;
      }

      const { data: files } = await supabase.storage
        .from(SITE_ASSET_BUCKET)
        .list(folder.name, { limit: 200, sortBy: { column: "name", order: "desc" } });
      for (const file of files || []) {
        if (!file.id) continue;
        if (out.length >= MAX_ITEMS) break;
        out.push({
          url: `/site-assets/${folder.name}/${file.name}`,
          name: prettyName(file.name),
          kind: siteAssetKind(file.name),
          sizeBytes: Number((file.metadata as Record<string, unknown> | null)?.size ?? 0) || null,
          updatedAt: file.updated_at || file.created_at || null,
          source: "storage",
        });
      }
    }
  } catch {
    return out;
  }
  return out;
}

async function listFromLocalPublic(): Promise<SiteAssetItem[]> {
  const baseDir = path.join(process.cwd(), "public", "site-assets");
  const out: SiteAssetItem[] = [];

  const walk = async (dir: string, prefix: string, depth: number) => {
    if (depth > 3 || out.length >= MAX_ITEMS) return;
    let entries: Array<{ name: string; isDirectory: () => boolean }>;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= MAX_ITEMS) return;
      const full = path.join(dir, entry.name);
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(full, rel, depth + 1);
        continue;
      }
      const stats = await fs.stat(full).catch(() => null);
      out.push({
        url: `/site-assets/${rel}`,
        name: prettyName(entry.name),
        kind: siteAssetKind(entry.name),
        sizeBytes: stats ? stats.size : null,
        updatedAt: stats ? stats.mtime.toISOString() : null,
        source: "local",
      });
    }
  };

  await walk(baseDir, "", 0);
  return out;
}

/** URLs already used somewhere in the site settings — the FTP-hosted ones included. */
export async function listReferencedAssets(): Promise<SiteAssetItem[]> {
  const urls = new Set<string>();
  const push = (value: unknown) => {
    const url = String(value || "").trim();
    if (!url) return;
    if (!/^(https?:\/\/|\/)/i.test(url)) return;
    urls.add(url);
  };

  try {
    const { getLandingSettings } = await import("@/lib/catalog/landingSettings");
    const landing = await getLandingSettings();
    push(landing.heroVideoUrl);
    push(landing.shopHeroImage);
    for (const section of landing.shopHeroSections || []) {
      push(section.image);
      push(section.videoUrl);
      push(section.videoPoster);
    }
    for (const video of landing.uniformsVideos || []) push((video as { src?: string }).src);
  } catch {
    // Settings unavailable — the storage listing still stands on its own.
  }

  try {
    const { getCategoryContentSettings } = await import("@/lib/catalog/categoryContent.server");
    const entries = await getCategoryContentSettings();
    for (const entry of Object.values(entries)) {
      push(entry.heroImage);
      push(entry.heroVideoUrl);
      push(entry.heroVideoPoster);
    }
  } catch {
    // Same.
  }

  return Array.from(urls).map((url) => ({
    url,
    name: prettyName(decodeURIComponent(url.split("/").pop() || url)),
    kind: siteAssetKind(url),
    sizeBytes: null,
    updatedAt: null,
    source: "referenced" as const,
  }));
}

export async function listSiteAssetLibrary(): Promise<SiteAssetItem[]> {
  const [stored, local, referenced] = await Promise.all([
    listFromSupabase(),
    listFromLocalPublic(),
    listReferencedAssets(),
  ]);

  const byUrl = new Map<string, SiteAssetItem>();
  for (const item of [...stored, ...local, ...referenced]) {
    if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  }

  return Array.from(byUrl.values()).sort((a, b) => {
    const left = a.updatedAt || "";
    const right = b.updatedAt || "";
    if (left && right) return right.localeCompare(left);
    if (left) return -1;
    if (right) return 1;
    return a.name.localeCompare(b.name, "sr");
  });
}
