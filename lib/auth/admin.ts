import type { NextRequest } from "next/server";

const ADMIN_ACCESS_TOKEN = process.env.ADMIN_ACCESS_TOKEN?.trim();
const CRON_SECRET = process.env.CRON_SECRET?.trim();

export const isAdminProtectionEnabled = Boolean(ADMIN_ACCESS_TOKEN);

export function hasAdminToken(req: NextRequest) {
  if (!ADMIN_ACCESS_TOKEN) return true;
  const headerToken = req.headers.get("x-admin-token");
  const cookieToken = req.cookies.get("admin_token")?.value;
  return headerToken === ADMIN_ACCESS_TOKEN || cookieToken === ADMIN_ACCESS_TOKEN;
}

export function hasCronSecret(req: NextRequest) {
  if (!CRON_SECRET) return false;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
  const header = req.headers.get("x-cron-secret") || "";
  return bearer === CRON_SECRET || header === CRON_SECRET;
}

