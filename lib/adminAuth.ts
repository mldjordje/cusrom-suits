import type { NextRequest } from "next/server";
import { getAdminPermissionsForRoles, type AdminPermission, type AdminRoleId, type AdminViewer } from "@/lib/adminRoles";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_LEGACY_TOKEN_COOKIE = "admin_token";

type CookieReader = {
  get(name: string): { value?: string } | undefined;
};

type AdminSessionPayload = {
  id: string;
  username: string;
  displayName: string;
  roleIds: AdminRoleId[];
  permissions: AdminPermission[];
  issuedAt: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let sessionKeyPromise: Promise<CryptoKey> | null = null;

const normalize = (value: string) => value.trim();

const getAdminCredentials = () => ({
  username: normalize(process.env.ADMIN_USERNAME || "santos").toLowerCase(),
  password: normalize(process.env.ADMIN_PASSWORD || "santorini"),
});

const DEFAULT_SESSION_SECRET = "santos-admin-session-dev-only-change-me";

const getSessionSecret = () => {
  const envSecret = normalize(process.env.ADMIN_SESSION_SECRET || "");
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[adminAuth] ADMIN_SESSION_SECRET is not set. Using unsafe default. Set it in production env!",
    );
  }
  return DEFAULT_SESSION_SECRET;
};

const bytesToBinary = (bytes: Uint8Array) => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return binary;
};

const binaryToBytes = (binary: string) => Uint8Array.from(binary, (char) => char.charCodeAt(0));

const encodeBase64Url = (input: Uint8Array) =>
  btoa(bytesToBinary(input)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const decodeBase64Url = (input: string) => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return binaryToBytes(atob(padded));
};

const getSessionKey = async () => {
  if (!sessionKeyPromise) {
    sessionKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(getSessionSecret()),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return sessionKeyPromise;
};

const signSessionPayload = async (encodedPayload: string) => {
  const key = await getSessionKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload));
  return encodeBase64Url(new Uint8Array(signature));
};

const getLegacyBootstrapViewer = (): AdminViewer => {
  const credentials = getAdminCredentials();
  return {
    id: "admin_owner_bootstrap",
    username: credentials.username,
    displayName: "Santos Owner",
    roleIds: ["owner"],
    permissions: ["*"],
  };
};

const parseSignedSession = async (value?: string | null): Promise<AdminViewer | null> => {
  if (!value || !value.includes(".")) return null;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = await signSessionPayload(encodedPayload);
  if (expected !== signature) return null;

  try {
    const payload = JSON.parse(decoder.decode(decodeBase64Url(encodedPayload))) as AdminSessionPayload;
    const roleIds = Array.isArray(payload?.roleIds) ? payload.roleIds : [];
    const permissions =
      Array.isArray(payload?.permissions) && payload.permissions.length
        ? payload.permissions
        : getAdminPermissionsForRoles(roleIds);
    if (!payload?.id || !payload?.username) return null;
    return {
      id: payload.id,
      username: payload.username,
      displayName: payload.displayName || payload.username,
      roleIds,
      permissions,
    };
  } catch {
    return null;
  }
};

const parseLegacySimpleSession = (value?: string | null): AdminViewer | null => {
  const credentials = getAdminCredentials();
  const expected = `simple:${credentials.username}:${credentials.password}`;
  return value === expected ? getLegacyBootstrapViewer() : null;
};

export const buildAdminSessionValue = async (viewer: AdminViewer) => {
  const payload: AdminSessionPayload = {
    id: viewer.id,
    username: viewer.username,
    displayName: viewer.displayName,
    roleIds: viewer.roleIds,
    permissions: viewer.permissions,
    issuedAt: Date.now(),
  };
  const encodedPayload = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${encodedPayload}.${await signSessionPayload(encodedPayload)}`;
};

export const parseAdminSessionValue = async (value?: string | null): Promise<AdminViewer | null> =>
  (await parseSignedSession(value)) ?? parseLegacySimpleSession(value);

export const getLegacyAdminAccessToken = () => normalize(process.env.ADMIN_ACCESS_TOKEN || "");

export const isValidLegacyAdminToken = (value?: string | null) => {
  const expected = getLegacyAdminAccessToken();
  if (!expected) return false;
  return normalize(value || "") === expected;
};

export const isValidAdminSession = async (value?: string | null) => Boolean(await parseAdminSessionValue(value));

export const getAdminViewerFromCookieStore = async (cookieStore: CookieReader): Promise<AdminViewer | null> => {
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const sessionViewer = await parseAdminSessionValue(sessionCookie);
  if (sessionViewer) return sessionViewer;

  const legacyCookie = cookieStore.get(ADMIN_LEGACY_TOKEN_COOKIE)?.value;
  return isValidLegacyAdminToken(legacyCookie) ? getLegacyBootstrapViewer() : null;
};

export const getAdminViewerFromRequest = async (req: NextRequest): Promise<AdminViewer | null> => {
  const cookieViewer = await getAdminViewerFromCookieStore(req.cookies);
  if (cookieViewer) return cookieViewer;

  const headerToken = req.headers.get("x-admin-token");
  const queryToken = req.nextUrl.searchParams.get("token");
  return isValidLegacyAdminToken(headerToken) || isValidLegacyAdminToken(queryToken)
    ? getLegacyBootstrapViewer()
    : null;
};

export const isAdminRequestAuthenticated = async (req: NextRequest) => Boolean(await getAdminViewerFromRequest(req));

export const hasAdminPermission = (
  viewer: Pick<AdminViewer, "permissions"> | null | undefined,
  permission: AdminPermission,
) => {
  if (!viewer) return false;
  return viewer.permissions.includes("*") || viewer.permissions.includes(permission);
};

export const sanitizeAdminNextPath = (value?: string | null) => {
  const next = String(value || "").trim();
  if (!next.startsWith("/")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (next.startsWith("/api/")) return "/admin";
  return next;
};
