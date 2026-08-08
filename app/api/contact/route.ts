import { NextRequest, NextResponse } from "next/server";
import { trackVercelServerEvent } from "@/lib/analytics/vercel";
import { appendContactMessage, type ContactMessage } from "@/lib/contact/messages";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/security/rateLimit";
import { sendContactNotifications } from "@/lib/email/notifications";
import { classifySubmission } from "@/lib/security/spam";

const sanitize = (value: FormDataEntryValue | null) =>
  String(value || "").trim().slice(0, 2000);

// Burst limit plus an hourly cap, so one IP cannot drip-feed under the minute window.
const RATE_LIMIT = { limit: 3, windowMs: 60_000, scope: "contact" } as const;
const HOURLY_LIMIT = { limit: 10, windowMs: 3_600_000, scope: "contact-hour" } as const;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, message: "Previse zahteva. Pokusaj za nekoliko sekundi." },
      { status: 429, headers: buildRateLimitHeaders(rate, RATE_LIMIT.limit) },
    );
  }
  const hourly = checkRateLimit(req, HOURLY_LIMIT);
  if (!hourly.ok) {
    return NextResponse.json(
      { success: false, message: "Previse zahteva. Pokusaj kasnije." },
      { status: 429, headers: buildRateLimitHeaders(hourly, HOURLY_LIMIT.limit) },
    );
  }
  const contentType = req.headers.get("content-type") || "";
  let name = "";
  let email = "";
  let phone = "";
  let company = "";
  let subject = "";
  let message = "";
  let preferredStore = "";
  let source = "";
  let honeypot = "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    name = sanitize(body?.name ?? "");
    email = sanitize(body?.email ?? "");
    phone = sanitize(body?.phone ?? "");
    company = sanitize(body?.company ?? "");
    subject = sanitize(body?.subject ?? "");
    message = sanitize(body?.message ?? "");
    preferredStore = sanitize(body?.preferredStore ?? "");
    source = sanitize(body?.source ?? "");
    honeypot = sanitize(body?.website ?? "");
  } else {
    const form = await req.formData();
    name = sanitize(form.get("name"));
    email = sanitize(form.get("email"));
    phone = sanitize(form.get("phone"));
    company = sanitize(form.get("company"));
    subject = sanitize(form.get("subject"));
    message = sanitize(form.get("message"));
    preferredStore = sanitize(form.get("preferredStore"));
    source = sanitize(form.get("source"));
    honeypot = sanitize(form.get("website"));
  }

  if (!name || !email || !message) {
    return NextResponse.json({ success: false, message: "Name, email and message are required." }, { status: 400 });
  }

  // Honeypot: bots fill the hidden "website" field, humans don't
  if (honeypot) {
    return NextResponse.json({ success: true, data: null });
  }

  const spam = classifySubmission({ name, email, phone, company, subject, message, preferredStore });
  if (spam.verdict === "spam") {
    console.warn("[contact] dropped spam:", spam.reasons.join(","));
    return NextResponse.json({ success: true, data: null });
  }

  const entry: ContactMessage = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name,
    email,
    phone,
    ...(company ? { company } : {}),
    subject,
    message,
    preferredStore,
    source: source || "kontakt-forma",
    createdAt: new Date().toISOString(),
  };

  await appendContactMessage(entry);
  void trackVercelServerEvent("contact_submitted", {
    source: entry.source,
    preferredStore: entry.preferredStore || "unspecified",
    hasPhone: entry.phone ? 1 : 0,
  });
  // Quarantined messages stay in the admin inbox but never trigger an email.
  if (spam.verdict !== "quarantine") {
    void sendContactNotifications({
      name: entry.name,
      email: entry.email,
      phone: entry.phone || undefined,
      subject: entry.subject || undefined,
      message: entry.message,
      preferredStore: entry.preferredStore || undefined,
      source: entry.source || undefined,
    }).catch((err) => console.error("[contact] sendContactNotifications failed:", err));
  }

  if (contentType.includes("application/json")) {
    return NextResponse.json({ success: true, data: entry });
  }

  const redirectUrl = new URL("/kontakt?sent=1", req.nextUrl.origin);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
