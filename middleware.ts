import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_LEGACY_TOKEN_COOKIE,
  isAdminRequestAuthenticated,
  isValidLegacyAdminToken,
  sanitizeAdminNextPath,
} from "@/lib/adminAuth";
import { updateStorefrontSupabaseSession } from "@/lib/supabase/update-storefront-session";

// Bots/scrapers frequently crawl the raw *.vercel.app alias directly (it's
// what shows up in Vercel's own dashboards/DNS scans), not through the real
// domain a customer would type. Block it at the edge so that traffic never
// reaches the app or gets counted as real visitors.
const BLOCKED_HOST_SUFFIX = ".vercel.app";

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (host.toLowerCase().endsWith(BLOCKED_HOST_SUFFIX)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const pathname = req.nextUrl.pathname;
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (!isAdminArea) {
    const shouldRefreshStorefrontAuth =
      pathname.startsWith("/nalog") ||
      pathname === "/checkout" ||
      pathname.startsWith("/api/storefront/orders") ||
      (pathname === "/api/orders" && req.method === "POST");
    if (shouldRefreshStorefrontAuth) {
      return updateStorefrontSupabaseSession(req);
    }
    return NextResponse.next();
  }

  if (
    pathname === "/admin-login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/auth/google" ||
    pathname === "/api/admin/auth/google/callback"
  ) {
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
  // Broad matcher so the vercel.app host block applies everywhere, not just
  // the admin/auth routes the rest of this middleware cares about.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
