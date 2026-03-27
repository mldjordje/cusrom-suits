import { NextRequest, NextResponse } from "next/server";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/adminUsers";
import { getAdminRoleDefinitions, type AdminRoleId } from "@/lib/adminRoles";
import { getAdminViewerFromRequest, hasAdminPermission } from "@/lib/adminAuth";

const toRoleIds = (values: string[]): AdminRoleId[] => values.filter(Boolean) as AdminRoleId[];

const getViewer = async (req: NextRequest) => {
  const viewer = await getAdminViewerFromRequest(req);
  if (!hasAdminPermission(viewer, "admin.users.manage")) return null;
  return viewer;
};

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Nemate dozvolu za upravljanje admin korisnicima." }, { status: 403 });

const redirectBack = (req: NextRequest, status?: string, error?: string) => {
  const url = new URL("/admin/users", req.url);
  if (status) url.searchParams.set("status", status);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, { status: 303 });
};

export async function GET(req: NextRequest) {
  if (!(await getViewer(req))) return unauthorized();
  return NextResponse.json({
    success: true,
    roles: getAdminRoleDefinitions(),
    users: await listAdminUsers(),
  });
}

export async function POST(req: NextRequest) {
  if (!(await getViewer(req))) return unauthorized();

  const contentType = req.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  try {
    if (isForm) {
      const formData = await req.formData();
      const action = String(formData.get("action") || "create");
      const id = String(formData.get("id") || "");
      const username = String(formData.get("username") || "");
      const displayName = String(formData.get("displayName") || "");
      const password = String(formData.get("password") || "");
      const roleIds = toRoleIds(formData.getAll("roleIds").map((value) => String(value)));
      const isActive = formData.get("isActive") === "on";

      if (action === "delete") {
        await deleteAdminUser(id);
        return redirectBack(req, "deleted");
      }

      if (action === "update") {
        await updateAdminUser(id, { username, displayName, password, roleIds, isActive });
        return redirectBack(req, "saved");
      }

      await createAdminUser({ username, displayName, password, roleIds, isActive });
      return redirectBack(req, "created");
    }

    const payload = await req.json().catch(() => null);
    const action = String(payload?.action || "create");
    if (action === "delete") {
      await deleteAdminUser(String(payload?.id || ""));
      return NextResponse.json({ success: true });
    }
    if (action === "update") {
      const user = await updateAdminUser(String(payload?.id || ""), {
        username: String(payload?.username || ""),
        displayName: String(payload?.displayName || ""),
        password: String(payload?.password || ""),
        roleIds: toRoleIds(Array.isArray(payload?.roleIds) ? payload.roleIds.map(String) : []),
        isActive: Boolean(payload?.isActive),
      });
      return NextResponse.json({ success: true, user });
    }

    const user = await createAdminUser({
      username: String(payload?.username || ""),
      displayName: String(payload?.displayName || ""),
      password: String(payload?.password || ""),
      roleIds: toRoleIds(Array.isArray(payload?.roleIds) ? payload.roleIds.map(String) : []),
      isActive: Boolean(payload?.isActive),
    });
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    const message = error?.message || "Neuspesna izmena admin korisnika.";
    if (isForm) {
      return redirectBack(req, undefined, message);
    }
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
