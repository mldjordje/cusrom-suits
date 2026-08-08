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
const IMAGE_OPTIMIZER_PATH = "/_next/image";
const MAX_LEGACY_CRAWL_SEGMENTS = 5;

// Paths we own and must never run the scanner heuristics against. `/api/`
// matters most: `app/api/fabrics.php` is a real route whose name would
// otherwise trip the PHP extension rule below.
const SCANNER_SKIP_PREFIXES = [
  "/api/",
  "/_next/",
  "/fajlovi/",
  "/site-assets/",
  "/uploads/",
  "/assets/",
  "/img/",
  "/.well-known/",
];

// Server stacks this app does not run. A request for any of them is a
// vulnerability scanner, never a customer.
const SCANNER_EXTENSION_PATTERN =
  /\.(php\d?|phtml|phar|asp|aspx|jsp|jspx|cgi|pl|sh|bak|old|sql|swp|env|ini|cfm|htm|html)$/i;

// Known scanner roots. `/sqed/*` and `/banco*` are phishing-kit probes: bots
// checking whether someone already dropped a phishing page on this host.
const SCANNER_PREFIX_PATTERN =
  /^\/(sqed|banco|bancopopular|wp|wordpress|wp-admin|wp-content|wp-includes|cgi-bin|phpmyadmin|phpmyadm|pma|myadmin|adminer|vendor|views|autodiscover|owa|ecp|solr|struts|actuator|telescope|_ignition|_profiler|\.git|\.env|\.aws|\.svn|\.vscode|\.idea)(\/|$)/i;

const isKnownScannerPath = (pathname: string) => {
  if (SCANNER_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  if (pathname.includes("..") || pathname.includes("\0")) return true;
  if (SCANNER_PREFIX_PATTERN.test(pathname)) return true;
  return SCANNER_EXTENSION_PATTERN.test(pathname);
};

const isMalformedImageOptimizerRequest = (req: NextRequest) =>
  req.nextUrl.pathname === IMAGE_OPTIMIZER_PATH &&
  (!req.nextUrl.searchParams.has("url") ||
    !req.nextUrl.searchParams.has("w") ||
    !req.nextUrl.searchParams.has("q"));

const isLikelyMalformedLegacyCrawl = (pathname: string) => {
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/custom-suits") ||
    pathname.startsWith("/site-assets/") ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/fajlovi/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/img/")
  ) {
    return false;
  }

  const segments = pathname.split("/").filter(Boolean);
  return segments.length > MAX_LEGACY_CRAWL_SEGMENTS;
};

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (host.toLowerCase().endsWith(BLOCKED_HOST_SUFFIX)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const pathname = req.nextUrl.pathname;
  if (
    isKnownScannerPath(pathname) ||
    isMalformedImageOptimizerRequest(req) ||
    isLikelyMalformedLegacyCrawl(pathname)
  ) {
    // Plain 404 with no HTML: the analytics script never loads, so these stop
    // showing up as "top pages" in Vercel Analytics.
    return new NextResponse("Not Found", { status: 404 });
  }

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
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
