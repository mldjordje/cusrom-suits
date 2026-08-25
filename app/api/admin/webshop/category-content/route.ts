import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthenticated } from "@/lib/adminAuth";
import {
  categoryContentKey,
} from "@/lib/catalog/categoryContent";
import {
  getCategoryContentSettings,
  saveCategoryContentSettings,
} from "@/lib/catalog/categoryContent.server";
import { ALL_AUTO_GROUPS, listCategoryRegistry } from "@/lib/catalog/categories";

const requireAdmin = async (req: NextRequest) => {
  if (await isAdminRequestAuthenticated(req)) return null;
  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
};

/**
 * Every category the admin can configure: the ten shop groups first, then the
 * registry subcategories filed under them (Manžetne, Lančić, Kaiševi …). The
 * subcategories are what the client actually names when asking for different
 * copy, and they have no route of their own, so they cannot be derived from
 * CATEGORY_ROUTES.
 */
const listConfigurableCategories = async () => {
  const groups = ALL_AUTO_GROUPS.map((group) => ({
    key: categoryContentKey(group.key),
    label: group.name,
    parent: "",
  }));
  const groupKeys = new Set(groups.map((group) => group.key));

  const registry = await listCategoryRegistry();
  const seen = new Set(groupKeys);
  const children: Array<{ key: string; label: string; parent: string }> = [];

  for (const row of registry) {
    if (row.isVisible === false) continue;
    const key = categoryContentKey(row.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    children.push({
      key,
      label: row.name,
      parent: ALL_AUTO_GROUPS.find((group) => group.key === row.parentGroup)?.name || "",
    });
  }

  children.sort((left, right) =>
    (left.parent || "").localeCompare(right.parent || "", "sr") ||
    left.label.localeCompare(right.label, "sr"),
  );

  return [...groups, ...children];
};

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const [settings, categories] = await Promise.all([
    getCategoryContentSettings(),
    listConfigurableCategories(),
  ]);
  return NextResponse.json({ success: true, settings, categories });
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Neispravan zahtev." }, { status: 400 });
  }

  const entries = (payload as Record<string, unknown>).entries;
  if (entries == null) {
    return NextResponse.json({ success: false, message: "Nedostaju podaci." }, { status: 400 });
  }

  /* A full replace, not a merge: the admin screen always submits every row it
     rendered, and a merge would make a cleared field indistinguishable from an
     untouched one. */
  const settings = await saveCategoryContentSettings(entries);
  return NextResponse.json({ success: true, settings });
}
