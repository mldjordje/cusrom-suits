import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { deletePost, listPosts, upsertPost } from "@/lib/blog/store";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const params = req.nextUrl.searchParams;
  const q = params.get("q") || "";
  const typeRaw = params.get("type") || "all";
  const type = typeRaw === "blog" || typeRaw === "news" ? typeRaw : "all";
  const page = Number.parseInt(params.get("page") || "1", 10) || 1;
  const pageSize = Number.parseInt(params.get("pageSize") || "50", 10) || 50;
  const result = await listPosts({ query: q, type, page, pageSize, onlyPublished: false });
  return NextResponse.json({ success: true, data: result.items, pagination: result });
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  if (!payload?.title) {
    return NextResponse.json({ success: false, message: "Title is required." }, { status: 400 });
  }
  const post = await upsertPost(payload);
  return NextResponse.json({ success: true, data: post });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  if (!payload?.id || !payload?.title) {
    return NextResponse.json({ success: false, message: "id and title are required." }, { status: 400 });
  }
  const post = await upsertPost(payload);
  return NextResponse.json({ success: true, data: post });
}

export async function DELETE(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "Missing id." }, { status: 400 });
  }
  await deletePost(id);
  return NextResponse.json({ success: true });
}

