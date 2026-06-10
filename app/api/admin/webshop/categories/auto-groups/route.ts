import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import { ALL_AUTO_GROUPS, getAutoGroupSettings, setAutoGroupSettings } from "@/lib/catalog/categories";

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const settings = await getAutoGroupSettings();
  return NextResponse.json({ success: true, ...settings, allGroups: ALL_AUTO_GROUPS });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  const enabledGroups: string[] = Array.isArray(payload?.enabledGroups)
    ? (payload.enabledGroups as unknown[]).map(String).filter(Boolean)
    : [];
  await setAutoGroupSettings(enabledGroups);
  return NextResponse.json({ success: true, enabledGroups });
}
