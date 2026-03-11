import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog/store";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const post = await getPostBySlug(slug);
  if (!post || !post.isPublished) {
    return NextResponse.json({ success: false, message: "Post not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: post });
}

