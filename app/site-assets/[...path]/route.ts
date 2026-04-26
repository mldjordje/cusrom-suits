import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { applyDefaultPublicCache } from "@/lib/http/cache";
import { downloadSiteAsset, normalizeSiteAssetPath } from "@/lib/storage/siteAssets";

const passthroughHeaders = [
  "content-type",
  "content-length",
];

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
};

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

export async function GET(_req: NextRequest, context: RouteContext) {
  const storagePath = await resolvePath(context);
  const stored = await downloadSiteAsset(storagePath);

  if (stored) {
    const headers = new Headers();
    const ct = inferContentType(storagePath, stored.type || "");
    headers.set("content-type", ct);
    return buildCachedResponse(stored.stream(), 200, headers);
  }

  const local = await getLocalAsset(storagePath);
  if (local) {
    const headers = new Headers();
    headers.set("content-length", String(local.stats.size));
    headers.set("content-type", inferContentType(storagePath));
    return buildCachedResponse(local.buffer, 200, headers);
  }

  return buildCachedResponse("Not found", 404, new Headers());
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const response = await GET(req, context);
  return buildCachedResponse(null, response.status, new Headers(response.headers));
}
