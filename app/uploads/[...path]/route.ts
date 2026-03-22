import { NextRequest, NextResponse } from "next/server";
import { applyDefaultPublicCache } from "@/lib/http/cache";

const REMOTE_BASE = "https://customsuits.adspire.rs/uploads/";

const passthroughHeaders = [
  "content-type",
  "content-length",
  "cache-control",
  "etag",
  "last-modified",
];

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const resolvePath = async (context: RouteContext) => {
  const params = await context.params;
  return (params?.path || []).join("/");
};

export async function GET(req: NextRequest, context: RouteContext) {
  const path = await resolvePath(context);
  const url = `${REMOTE_BASE}${path}${req.nextUrl.search || ""}`;
  const upstream = await fetch(url, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  const headers = new Headers();
  for (const key of passthroughHeaders) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Access-Control-Allow-Origin", "*");

  return applyDefaultPublicCache(new NextResponse(upstream.body, { status: upstream.status, headers }), {
    maxAge: 3600,
    sMaxAge: 86400,
    staleWhileRevalidate: 86400,
  });
}

export async function HEAD(req: NextRequest, context: RouteContext) {
  const path = await resolvePath(context);
  const url = `${REMOTE_BASE}${path}${req.nextUrl.search || ""}`;
  const upstream = await fetch(url, {
    method: "HEAD",
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  const headers = new Headers();
  for (const key of passthroughHeaders) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Access-Control-Allow-Origin", "*");

  return applyDefaultPublicCache(new NextResponse(null, { status: upstream.status, headers }), {
    maxAge: 3600,
    sMaxAge: 86400,
    staleWhileRevalidate: 86400,
  });
}
