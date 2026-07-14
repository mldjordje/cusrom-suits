import { NextRequest, NextResponse } from "next/server";
import { hasAdminToken } from "@/lib/auth/admin";
import {
  deleteContactMessages,
  listContactMessages,
  updateContactMessageStatus,
  type ContactMessageStatus,
} from "@/lib/contact/messages";

const normalizeStatus = (value: unknown): ContactMessageStatus | null => {
  if (value === "resolved") return "resolved";
  if (value === "open") return "open";
  return null;
};

export async function GET(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const messages = await listContactMessages();
  return NextResponse.json({ success: true, messages });
}

export async function PATCH(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ success: false, message: "Invalid payload." }, { status: 400 });
  }
  const row = payload as Record<string, unknown>;
  const id = String(row.id || "").trim();
  const status = normalizeStatus(row.status);
  if (!id || !status) {
    return NextResponse.json(
      { success: false, message: "Missing id or valid status." },
      { status: 400 },
    );
  }
  const actor = String(row.actor || "").trim() || null;
  const updated = await updateContactMessageStatus(id, status, actor);
  if (!updated) {
    return NextResponse.json({ success: false, message: "Message not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true, message: updated });
}

export async function DELETE(req: NextRequest) {
  if (!hasAdminToken(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await req.json().catch(() => null);
  const ids = Array.isArray((payload as Record<string, unknown> | null)?.ids)
    ? ((payload as Record<string, unknown>).ids as unknown[]).map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  if (!ids.length) {
    return NextResponse.json({ success: false, message: "Missing ids." }, { status: 400 });
  }
  const removed = await deleteContactMessages(ids);
  return NextResponse.json({ success: true, removed });
}
