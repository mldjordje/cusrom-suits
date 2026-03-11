import { NextRequest, NextResponse } from "next/server";
import { listPosts } from "@/lib/blog/store";

const toString = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const query = toString(params.get("q") || "");
  const typeRaw = toString(params.get("type") || "all");
  const type = typeRaw === "blog" || typeRaw === "news" ? typeRaw : "all";
  const page = Number.parseInt(toString(params.get("page") || "1"), 10) || 1;
  const pageSize = Number.parseInt(toString(params.get("pageSize") || "12"), 10) || 12;

  const result = await listPosts({
    query,
    type,
    page,
    pageSize,
    onlyPublished: true,
  });

  return NextResponse.json({ success: true, data: result.items, pagination: result });
}

