import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_LEGACY_TOKEN_COOKIE = "admin_token";

type AdminCredentials = {
  username: string;
  password: string;
};

const normalize = (value: string) => value.trim();

export const getAdminCredentials = (): AdminCredentials => ({
  username: normalize(process.env.ADMIN_USERNAME || "santos"),
  password: normalize(process.env.ADMIN_PASSWORD || "santorini"),
});

export const buildAdminSessionValue = () => {
  const credentials = getAdminCredentials();
  return `simple:${credentials.username}:${credentials.password}`;
};

export const isValidAdminCredentials = (username: string, password: string) => {
  const credentials = getAdminCredentials();
  return normalize(username) === credentials.username && normalize(password) === credentials.password;
};

export const isValidAdminSession = (value?: string | null) => value === buildAdminSessionValue();

export const getLegacyAdminAccessToken = () => normalize(process.env.ADMIN_ACCESS_TOKEN || "");

export const isValidLegacyAdminToken = (value?: string | null) => {
  const expected = getLegacyAdminAccessToken();
  if (!expected) return false;
  return normalize(value || "") === expected;
};

export const isAdminRequestAuthenticated = (req: NextRequest) => {
  const sessionCookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const legacyCookie = req.cookies.get(ADMIN_LEGACY_TOKEN_COOKIE)?.value;
  const headerToken = req.headers.get("x-admin-token");
  const queryToken = req.nextUrl.searchParams.get("token");

  return (
    isValidAdminSession(sessionCookie) ||
    isValidLegacyAdminToken(legacyCookie) ||
    isValidLegacyAdminToken(headerToken) ||
    isValidLegacyAdminToken(queryToken)
  );
};

export const sanitizeAdminNextPath = (value?: string | null) => {
  const next = String(value || "").trim();
  if (!next.startsWith("/")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (next.startsWith("/api/")) return "/admin";
  return next;
};
