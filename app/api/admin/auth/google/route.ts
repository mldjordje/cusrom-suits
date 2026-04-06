import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GOOGLE_OAUTH_NEXT_COOKIE,
  ADMIN_GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthorizeUrl,
  createGoogleOAuthState,
  getAdminGoogleRedirectUri,
  isGoogleAdminSignInConfigured,
} from "@/lib/adminGoogleOAuth";
import { sanitizeAdminNextPath } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  if (!isGoogleAdminSignInConfigured()) {
    return NextResponse.json(
      { success: false, message: "Google admin sign-in is not configured." },
      { status: 503 },
    );
  }

  const nextPath = sanitizeAdminNextPath(req.nextUrl.searchParams.get("next"));
  const state = createGoogleOAuthState();
  const redirectUri = getAdminGoogleRedirectUri(req);
  const url = buildGoogleAuthorizeUrl({ redirectUri, state });

  const secure = req.nextUrl.protocol === "https:";
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 600,
  };

  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set(ADMIN_GOOGLE_OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(ADMIN_GOOGLE_OAUTH_NEXT_COOKIE, nextPath, cookieOpts);
  return res;
}
