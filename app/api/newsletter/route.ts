import { NextRequest, NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/newsletter/store";

const sanitize = (value: FormDataEntryValue | null) => String(value || "").trim().slice(0, 200);

export async function POST(req: NextRequest) {
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
