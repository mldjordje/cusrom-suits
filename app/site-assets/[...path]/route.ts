import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { applyDefaultPublicCache } from "@/lib/http/cache";
import { downloadSiteAsset, getSignedSiteAssetUrl, normalizeSiteAssetPath } from "@/lib/storage/siteAssets";

const MIME_BY_EXT: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".m4v": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".woff2": "font/woff2",
};

const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".avi", ".m4v", ".mpeg", ".mpg"]);

const inferContentType = (storagePath: string, blobType?: string) => {
  if (blobType) return blobType;
  const ext = path.extname(storagePath).toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
};

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const resolvePath = async (context: RouteContext) => {
  const params = await context.params;
  return normalizeSiteAssetPath((params?.path || []).join("/"));
};

const buildCachedResponse = (body: BodyInit | null, status: number, headers: Headers) =>
  applyDefaultPublicCache(new NextResponse(body, { status, headers }), {
    maxAge: 3600,
    sMaxAge: 86400,
    staleWhileRevalidate: 86400,
  });

const getLocalAsset = async (storagePath: string) => {
  const fullPath = path.join(process.cwd(), "public", "site-assets", storagePath);

  try {
    const [buffer, stats] = await Promise.all([fs.readFile(fullPath), fs.stat(fullPath)]);
    return { buffer, stats };
  } catch {
    return null;
  }
};

const parseRange = (rangeHeader: string, total: number) => {
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (!match) return null;
  const start = match[1] ? parseInt(match[1], 10) : total - parseInt(match[2] || "0", 10);
  const end = match[2] ? parseInt(match[2], 10) : total - 1;
  if (isNaN(start) || isNaN(end) || start > end || end >= total) return null;
  return { start, end };
};

export async function GET(req: NextRequest, context: RouteContext) {
  const storagePath = await resolvePath(context);
  const ext = path.extname(storagePath).toLowerCase();
  const isVideo = VIDEO_EXTS.has(ext);

  // For videos stored in Supabase, redirect to a signed URL so the browser
  // can stream directly with native Range request support.
  if (isVideo) {
    const signedUrl = await getSignedSiteAssetUrl(storagePath, 3600);
    if (signedUrl) {
      return NextResponse.redirect(signedUrl, { status: 302 });
    }
  }

  const stored = await downloadSiteAsset(storagePath);

  if (stored) {
    const ct = inferContentType(storagePath, stored.type || "");
    const headers = new Headers();
    headers.set("content-type", ct);
    return buildCachedResponse(stored.stream(), 200, headers);
  }

  const local = await getLocalAsset(storagePath);
  if (local) {
    const ct = inferContentType(storagePath);
    const headers = new Headers();
    headers.set("content-type", ct);
    headers.set("accept-ranges", "bytes");

    const rangeHeader = req.headers.get("range");
    if (isVideo && rangeHeader) {
      const total = local.stats.size;
      const range = parseRange(rangeHeader, total);
      if (!range) {
        headers.set("content-range", `bytes */${total}`);
        return new NextResponse(null, { status: 416, headers });
      }
      const { start, end } = range;
      headers.set("content-range", `bytes ${start}-${end}/${total}`);
      headers.set("content-length", String(end - start + 1));
      return new NextResponse(local.buffer.slice(start, end + 1), { status: 206, headers });
    }

    headers.set("content-length", String(local.stats.size));
    return buildCachedResponse(local.buffer, 200, headers);
  }

  return buildCachedResponse("Not found", 404, new Headers());
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const response = await GET(req, context);
  return buildCachedResponse(null, response.status, new Headers(response.headers));
}
