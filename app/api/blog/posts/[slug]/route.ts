import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog/store";
import { applyPublicCache } from "@/lib/http/cache";

export const revalidate = 300;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const post = await getPostBySlug(slug);
  if (!post || !post.isPublished) {
    return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
  }
  return applyPublicCache(NextResponse.json({ success: true, data: post }), {
    maxAge: 300,
    sMaxAge: 900,
    staleWhileRevalidate: 86400,
  });
}
