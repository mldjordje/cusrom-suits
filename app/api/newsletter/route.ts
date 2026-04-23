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

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    email = sanitize(body?.email ?? "");
    source = sanitize(body?.source ?? "");
  } else {
    const form = await req.formData();
    email = sanitize(form.get("email"));
    source = sanitize(form.get("source"));
  }

  const result = await subscribeToNewsletter({ email, source });
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
