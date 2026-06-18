import { NextRequest, NextResponse } from "next/server";
import { trackVercelServerEvent } from "@/lib/analytics/vercel";
import { subscribeToNewsletter } from "@/lib/newsletter/store";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/security/rateLimit";
import { sendNewsletterWelcome } from "@/lib/email/notifications";

const sanitize = (value: FormDataEntryValue | null) => String(value || "").trim().slice(0, 200);

const RATE_LIMIT = { limit: 5, windowMs: 60_000, scope: "newsletter" } as const;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, message: "Previse zahteva. Pokusaj za nekoliko sekundi." },
      { status: 429, headers: buildRateLimitHeaders(rate, RATE_LIMIT.limit) },
    );
  }
  const contentType = req.headers.get("content-type") || "";
  let email = "";
  let source = "";
  let firstName = "";
  let lastName = "";
  let birthDate = "";
  let gender = "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    email = sanitize(body?.email ?? "");
    source = sanitize(body?.source ?? "");
    firstName = sanitize(body?.firstName ?? "");
    lastName = sanitize(body?.lastName ?? "");
    birthDate = sanitize(body?.birthDate ?? "");
    gender = sanitize(body?.gender ?? "");
  } else {
    const form = await req.formData();
    email = sanitize(form.get("email"));
    source = sanitize(form.get("source"));
    firstName = sanitize(form.get("firstName"));
    lastName = sanitize(form.get("lastName"));
    birthDate = sanitize(form.get("birthDate"));
    gender = sanitize(form.get("gender"));
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
