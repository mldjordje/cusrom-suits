import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/storage/jsonStore";

const CONTACT_MESSAGES_PATH = "data/contact-messages.json";

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
};

const sanitize = (value: FormDataEntryValue | null) =>
  String(value || "").trim().slice(0, 2000);

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let name = "";
  let email = "";
  let phone = "";
  let subject = "";
  let message = "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    name = sanitize(body?.name ?? "");
    email = sanitize(body?.email ?? "");
    phone = sanitize(body?.phone ?? "");
    subject = sanitize(body?.subject ?? "");
    message = sanitize(body?.message ?? "");
  } else {
    const form = await req.formData();
    name = sanitize(form.get("name"));
    email = sanitize(form.get("email"));
    phone = sanitize(form.get("phone"));
    subject = sanitize(form.get("subject"));
    message = sanitize(form.get("message"));
  }

  if (!name || !email || !message) {
    return NextResponse.json({ success: false, message: "Name, email and message are required." }, { status: 400 });
  }

  const entry: ContactMessage = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    email,
    phone,
    subject,
    message,
    createdAt: new Date().toISOString(),
  };

  const list = await readJsonFile<ContactMessage[]>(CONTACT_MESSAGES_PATH, []);
  list.unshift(entry);
  await writeJsonFile(CONTACT_MESSAGES_PATH, list.slice(0, 1000));

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: true, data: entry });
  }

  const redirectUrl = new URL("/kontakt?sent=1", req.nextUrl.origin);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
