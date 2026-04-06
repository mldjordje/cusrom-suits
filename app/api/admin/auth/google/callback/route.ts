import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_GOOGLE_OAUTH_NEXT_COOKIE,
  ADMIN_GOOGLE_OAUTH_STATE_COOKIE,
  buildAdminViewerFromGoogleUser,
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserInfo,
  getAdminGoogleRedirectUri,
  isEmailAllowedForGoogleAdmin,
  isGoogleAdminSignInConfigured,
} from "@/lib/adminGoogleOAuth";
import { ADMIN_SESSION_COOKIE, buildAdminSessionValue, sanitizeAdminNextPath } from "@/lib/adminAuth";

const clearOAuthCookies = (res: NextResponse, secure: boolean) => {
  const opts = { path: "/", secure, sameSite: "lax" as const, maxAge: 0 };
  res.cookies.set(ADMIN_GOOGLE_OAUTH_STATE_COOKIE, "", opts);
  res.cookies.set(ADMIN_GOOGLE_OAUTH_NEXT_COOKIE, "", opts);
};

export async function GET(req: NextRequest) {
  const secure = req.nextUrl.protocol === "https:";
  const loginBase = new URL("/admin-login", req.url);

  const fail = (code: string) => {
    const nextFromCookie = req.cookies.get(ADMIN_GOOGLE_OAUTH_NEXT_COOKIE)?.value;
    const nextPath = sanitizeAdminNextPath(nextFromCookie);
    loginBase.searchParams.set("error", code);
    loginBase.searchParams.set("next", nextPath);
    const res = NextResponse.redirect(loginBase, { status: 303 });
    clearOAuthCookies(res, secure);
    return res;
  };

  if (!isGoogleAdminSignInConfigured()) {
    return fail("google_config");
  }

  const stateParam = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const stateCookie = req.cookies.get(ADMIN_GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const nextPath = sanitizeAdminNextPath(req.cookies.get(ADMIN_GOOGLE_OAUTH_NEXT_COOKIE)?.value);

  if (!stateParam || !stateCookie || stateParam !== stateCookie || !code) {
    return fail("google_state");
  }

  const redirectUri = getAdminGoogleRedirectUri(req);

  let accessToken: string;
  try {
    const tokens = await exchangeGoogleAuthorizationCode({ code, redirectUri });
    accessToken = String(tokens.access_token || "");
    if (!accessToken) throw new Error("missing token");
  } catch {
    return fail("google_token");
  }

  let user;
  try {
    user = await fetchGoogleUserInfo(accessToken);
  } catch {
    return fail("google_profile");
  }

  const email = String(user.email || "");
  const verified = user.email_verified === true || user.email_verified === "true";
  if (!verified || !isEmailAllowedForGoogleAdmin(email)) {
    return fail("google_forbidden");
  }

  const viewer = buildAdminViewerFromGoogleUser(user);
  let sessionValue: string;
  try {
    sessionValue = await buildAdminSessionValue(viewer);
  } catch {
    return fail("google_session");
  }

  const res = NextResponse.redirect(new URL(nextPath, req.url), { status: 303 });
  clearOAuthCookies(res, secure);
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
  });
  return res;
}
