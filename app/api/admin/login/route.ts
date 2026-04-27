import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminUser } from "@/lib/adminUsers";
import {
  ADMIN_LEGACY_TOKEN_COOKIE,
  ADMIN_SESSION_COOKIE,
  buildAdminSessionValue,
  sanitizeAdminNextPath,
} from "@/lib/adminAuth";

const isFormRequest = (req: NextRequest) => {
  const contentType = req.headers.get("content-type") || "";
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
};

const createAuthedResponse = (
  req: NextRequest,
  nextPath: string,
  sessionValue: string,
) => {
  const response = isFormRequest(req)
    ? NextResponse.redirect(new URL(nextPath, req.url), { status: 303 })
    : NextResponse.json({ success: true, next: nextPath });

  response.cookies.set(ADMIN_SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    path: "/",
    // 30-day persistent cookie — survives PWA app restarts and browser restarts
    maxAge: 60 * 60 * 24 * 30,
  });
  response.cookies.delete(ADMIN_LEGACY_TOKEN_COOKIE);
  return response;
};

const createInvalidResponse = (req: NextRequest, nextPath: string) => {
  if (isFormRequest(req)) {
    const loginUrl = new URL("/admin-login", req.url);
    loginUrl.searchParams.set("error", "1");
    loginUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  return NextResponse.json(
    { success: false, message: "Pogresno korisnicko ime ili lozinka." },
    { status: 401 },
  );
};

export async function POST(req: NextRequest) {
  const nextFromQuery = sanitizeAdminNextPath(req.nextUrl.searchParams.get("next"));

  if (isFormRequest(req)) {
    const formData = await req.formData();
    const username = String(formData.get("username") || "");
    const password = String(formData.get("password") || "");
    const nextPath = sanitizeAdminNextPath(String(formData.get("next") || nextFromQuery));
    const viewer = await authenticateAdminUser(username, password);
    if (!viewer) {
      return createInvalidResponse(req, nextPath);
    }
    return createAuthedResponse(req, nextPath, await buildAdminSessionValue(viewer));
  }

  const payload = await req.json().catch(() => null);
  const username = String(payload?.username || "");
  const password = String(payload?.password || "");
  const nextPath = sanitizeAdminNextPath(payload?.next || nextFromQuery);

  const viewer = await authenticateAdminUser(username, password);
  if (!viewer) {
    return createInvalidResponse(req, nextPath);
  }

  return createAuthedResponse(req, nextPath, await buildAdminSessionValue(viewer));
}
