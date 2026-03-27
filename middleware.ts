import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LEGACY_TOKEN_COOKIE,
  isAdminRequestAuthenticated,
  isValidLegacyAdminToken,
  sanitizeAdminNextPath,
} from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (pathname === "/admin-login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (isValidLegacyAdminToken(req.nextUrl.searchParams.get("token"))) {
    const token = String(req.nextUrl.searchParams.get("token") || "");
    const cleanUrl = req.nextUrl.clone();
    cleanUrl.searchParams.delete("token");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(ADMIN_LEGACY_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
    });
    return res;
  }

  if (await isAdminRequestAuthenticated(req)) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/admin-login";
  loginUrl.search = "";
  loginUrl.searchParams.set(
    "next",
    sanitizeAdminNextPath(`${req.nextUrl.pathname}${req.nextUrl.search}`),
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
