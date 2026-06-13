import { NextRequest, NextResponse } from "next/server";
import { evaluateVoucher } from "@/lib/storefront/fulfillment";
import { buildRateLimitHeaders, checkRateLimit } from "@/lib/security/rateLimit";

const RATE_LIMIT = { limit: 10, windowMs: 60_000, scope: "voucher" } as const;

export async function POST(req: NextRequest) {
  const rate = checkRateLimit(req, RATE_LIMIT);
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, message: "Previse zahteva. Pokusaj za nekoliko sekundi." },
      { status: 429, headers: buildRateLimitHeaders(rate, RATE_LIMIT.limit) },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, message: "Neispravan zahtev." }, { status: 400 });
  }

  const code = String(body?.code || "").trim().toUpperCase();
  const email = String(body?.email || "").trim();
  const subtotal = Math.max(0, Number(body?.subtotal || 0));
  const deliveryCost = Math.max(0, Number(body?.deliveryCost || 0));

  if (!code) {
    return NextResponse.json({ success: false, message: "Unesi vaučer kod." }, { status: 400 });
  }

  const result = await evaluateVoucher({ code, email, subtotal, deliveryCost });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    code,
    discountAmount: result.discountAmount,
    type: result.voucher.type,
    amount: result.voucher.amount,
  });
}
