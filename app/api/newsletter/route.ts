import { NextRequest, NextResponse } from "next/server";
import { trackVercelServerEvent } from "@/lib/analytics/vercel";
import { subscribeToNewsletter } from "@/lib/newsletter/store";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/security/rateLimit";
import { sendNewsletterWelcome } from "@/lib/email/notifications";
import { classifyNewsletterSignup } from "@/lib/security/spam";

const sanitize = (value: FormDataEntryValue | null) => String(value || "").trim().slice(0, 200);

const RATE_LIMIT = { limit: 5, windowMs: 60_000, scope: "newsletter" } as const;
// Every fresh signup sends a welcome email to whatever address was submitted,
// so an unbounded endpoint is an email-bombing tool. Cap it per IP per hour.
const HOURLY_LIMIT = { limit: 15, windowMs: 3_600_000, scope: "newsletter-hour" } as const;

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
  let email = "";
  let source = "";
  let firstName = "";
  let lastName = "";
  let birthDate = "";
  let gender = "";
  let honeypot = "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    honeypot = sanitize(body?.website ?? "");
    email = sanitize(body?.email ?? "");
    source = sanitize(body?.source ?? "");
    firstName = sanitize(body?.firstName ?? "");
    lastName = sanitize(body?.lastName ?? "");
    birthDate = sanitize(body?.birthDate ?? "");
    gender = sanitize(body?.gender ?? "");
  } else {
    const form = await req.formData();
    honeypot = sanitize(form.get("website"));
    email = sanitize(form.get("email"));
    source = sanitize(form.get("source"));
    firstName = sanitize(form.get("firstName"));
    lastName = sanitize(form.get("lastName"));
    birthDate = sanitize(form.get("birthDate"));
    gender = sanitize(form.get("gender"));
  }

  // Honeypot: bots fill the hidden "website" field, humans don't. Answer with a
  // plain success so the bot marks the target as done and stops retrying.
  if (honeypot) {
    return NextResponse.json({ success: true, duplicate: false, message: "Hvala!", data: null });
  }

  const spam = classifyNewsletterSignup({ email, firstName, lastName });
  if (spam.verdict === "spam") {
    console.warn("[newsletter] dropped spam signup:", spam.reasons.join(","));
    return NextResponse.json({ success: true, duplicate: false, message: "Hvala!", data: null });
  }

  const result = await subscribeToNewsletter({ email, source, firstName, lastName, birthDate, gender });
  const status = result.success ? 200 : 400;
  const isFreshSignup = result.success && !("duplicate" in result && result.duplicate);
  if (isFreshSignup) {
    void trackVercelServerEvent("newsletter_subscribed", {
      source: source || "storefront-footer",
    });
    const welcomeCode = String(process.env.NEWSLETTER_WELCOME_CODE || "").trim();
    void sendNewsletterWelcome({
      email,
      discountCode: welcomeCode || null,
    }).catch((err) => console.error("[newsletter] sendNewsletterWelcome failed:", err));
  }

  return NextResponse.json(
    {
      success: result.success,
      duplicate: "duplicate" in result ? result.duplicate : false,
      message: result.message,
      data: "subscriber" in result ? result.subscriber : null,
    },
    { status },
  );
}
