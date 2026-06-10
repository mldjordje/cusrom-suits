import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  createCategoryRegistryEntry,
  deleteCategoryRegistryEntry,
  listAdminCatalogCategories,
  updateCategoryRegistryEntry,
} from "@/lib/catalog/categories";

const parsePath = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : String(value || "")
        .split("/")
        .map((item) => item.trim())
        .filter(Boolean);

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const categories = await listAdminCatalogCategories();
  return NextResponse.json({ success: true, data: categories });
}

export async function POST(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  try {
    const category = await createCategoryRegistryEntry({
      name: String(payload?.name || ""),
      path: parsePath(payload?.path),
      parentId: Number(payload?.parentId || 0),
      description: payload?.description == null ? null : String(payload.description),
      mainColor: payload?.mainColor == null ? null : String(payload.mainColor),
      isVisible: payload?.isVisible !== false,
      isFeatured: payload?.isFeatured === true,
    });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Create category failed";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const categoryId = Number(payload?.id);
  try {
    const category = await updateCategoryRegistryEntry(categoryId, {
      name: payload?.name == null ? undefined : String(payload.name),
      path: payload?.path == null ? undefined : parsePath(payload.path),
      parentId: payload?.parentId == null ? undefined : Number(payload.parentId || 0),
      description: payload?.description == null ? undefined : String(payload.description),
      mainColor: payload?.mainColor == null ? undefined : String(payload.mainColor),
      isVisible: payload?.isVisible == null ? undefined : Boolean(payload.isVisible),
      isFeatured: payload?.isFeatured == null ? undefined : Boolean(payload.isFeatured),
    });
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update category failed";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const categoryId = Number(req.nextUrl.searchParams.get("id") || 0);
  try {
    await deleteCategoryRegistryEntry(categoryId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete category failed";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}

