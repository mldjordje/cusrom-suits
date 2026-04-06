import type { NextRequest } from "next/server";
import type { AdminViewer } from "@/lib/adminRoles";

export const ADMIN_GOOGLE_OAUTH_STATE_COOKIE = "admin_google_oauth_state";
export const ADMIN_GOOGLE_OAUTH_NEXT_COOKIE = "admin_google_oauth_next";

const normalizeEmail = (value: string) => value.trim().toLowerCase();

/**
 * Comma-separated env overrides the built-in owner allowlist.
 * Podrazumevano: pun admin (owner + sve permisije) za glavne naloge.
 */
const defaultAdminGoogleEmails = () => [
  normalizeEmail("web.wise018@gmail.com"),
  normalizeEmail("santorini.jocic@gmail.com"),
];

/**
 * Uvek ukljucuje ugradjene owner mejlove; ADMIN_GOOGLE_ALLOWED_EMAILS ih dodaje (ne zamenjuje),
 * da slucajna lista na Vercelu ne iskljuci pristup.
 */
export const getAdminGoogleAllowlist = (): string[] => {
  const raw = process.env.ADMIN_GOOGLE_ALLOWED_EMAILS?.trim();
  const extra = raw
    ? raw
        .split(",")
        .map((item) => normalizeEmail(item))
        .filter(Boolean)
    : [];
  return [...new Set([...defaultAdminGoogleEmails(), ...extra])];
};

export const isGoogleAdminSignInConfigured = () =>
  Boolean(
    process.env.ADMIN_GOOGLE_CLIENT_ID?.trim() && process.env.ADMIN_GOOGLE_CLIENT_SECRET?.trim(),
  );

export const getAdminGoogleClientId = () => process.env.ADMIN_GOOGLE_CLIENT_ID?.trim() || "";

/**
 * Mora biti identican na koraku /auth/google i u callback-u, i mora odgovarati hostu
 * na kom je postavljen OAuth state cookie (inace google_state).
 * Zato prvo koristimo origin zahteva, ne VERCEL_URL (cesto drugaciji od javnog domena).
 */
export const getAdminGoogleRedirectUri = (req: NextRequest): string => {
  const explicit = process.env.ADMIN_GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const fromOrigin = req.nextUrl?.origin?.replace(/\/$/, "").trim();
  if (fromOrigin && /^https?:\/\//i.test(fromOrigin)) {
    return `${fromOrigin}/api/admin/auth/google/callback`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (siteUrl) return `${siteUrl}/api/admin/auth/google/callback`;

  const vercel = process.env.VERCEL_URL?.trim().replace(/^https?:\/\//i, "");
  if (vercel) return `https://${vercel}/api/admin/auth/google/callback`;

  return "http://localhost:3000/api/admin/auth/google/callback";
};

const randomState = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const createGoogleOAuthState = () => randomState();

export const buildGoogleAuthorizeUrl = (input: { redirectUri: string; state: string }) => {
  const clientId = getAdminGoogleClientId();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: ["openid", "email", "profile"].join(" "),
    state: input.state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
};

export const exchangeGoogleAuthorizationCode = async (input: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse> => {
  const clientId = process.env.ADMIN_GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.ADMIN_GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  const body = new URLSearchParams({
    code: input.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!res.ok || !json?.access_token) {
    throw new Error("Google token exchange failed.");
  }
  return json;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  /** Google userinfo moze vratiti boolean ili string u JSON-u */
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
};

export const fetchGoogleUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as GoogleUserInfo | null;
  if (!res.ok || !json?.sub || !json.email) {
    throw new Error("Google userinfo failed.");
  }
  return json;
};

export const buildAdminViewerFromGoogleUser = (user: GoogleUserInfo): AdminViewer => {
  const email = normalizeEmail(String(user.email || ""));
  const sub = String(user.sub || "");
  const displayName = String(user.name || email || "Admin");
  const username = email.replace(/@/g, "_at_").replace(/[^a-z0-9._-]+/gi, "_");
  return {
    id: `google_${sub}`,
    username: username || `google_${sub.slice(0, 12)}`,
    displayName,
    roleIds: ["owner"],
    permissions: ["*"],
  };
};

export const isEmailAllowedForGoogleAdmin = (email: string) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const allow = new Set(getAdminGoogleAllowlist());
  return allow.has(normalized);
};
