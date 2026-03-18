import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_LEGACY_TOKEN_COOKIE,
  ADMIN_SESSION_COOKIE,
  sanitizeAdminNextPath,
} from "@/lib/adminAuth";

const isFormRequest = (req: NextRequest) => {
  const contentType = req.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
};

export async function POST(req: NextRequest) {
  const nextPath = sanitizeAdminNextPath(req.nextUrl.searchParams.get("next") || "/admin-login");
  const response = isFormRequest(req)
    ? NextResponse.redirect(new URL(nextPath, req.url), { status: 303 })
    : NextResponse.json({ success: true, next: nextPath });

  response.cookies.delete(ADMIN_SESSION_COOKIE);
  response.cookies.delete(ADMIN_LEGACY_TOKEN_COOKIE);

  return response;
}
