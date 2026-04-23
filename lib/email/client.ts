import { Resend } from "resend";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult =
  | { skipped: true; reason: string }
  | { sent: true; id: string | null }
  | { error: true; message: string };

const normalize = (value: string | undefined | null) => String(value || "").trim();

const getFromAddress = (override?: string) => {
  const fromEnv = normalize(process.env.MAIL_FROM);
  return override || fromEnv || "Santos & Santorini <no-reply@santos.rs>";
};

let cached: Resend | null | undefined;

const getResend = () => {
  if (cached !== undefined) return cached;
  const key = normalize(process.env.RESEND_API_KEY);
  if (!key) {
    cached = null;
    return null;
  }
  try {
    cached = new Resend(key);
    return cached;
  } catch (error) {
    console.warn("[email] Failed to initialize Resend client:", error);
    cached = null;
    return null;
  }
};

const sanitizeRecipients = (to: string | string[]): string[] => {
  const list = Array.isArray(to) ? to : [to];
  return list
    .map((value) => normalize(value))
    .filter((value) => value.length > 0 && value.includes("@"));
};

export const isEmailEnabled = () => Boolean(normalize(process.env.RESEND_API_KEY));

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = sanitizeRecipients(input.to);
  if (!recipients.length) {
    return { skipped: true, reason: "No valid recipients" };
  }

  const client = getResend();
  if (!client) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[email] RESEND_API_KEY not configured. Skipping email to ${recipients.join(", ")}: ${input.subject}`,
      );
    }
    return { skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(input.from),
      to: recipients,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (error) {
      console.error("[email] Resend send error:", error);
      return { error: true, message: String(error.message || error.name || error) };
    }

    return { sent: true, id: data?.id ?? null };
  } catch (error) {
    console.error("[email] Unexpected Resend error:", error);
    return {
      error: true,
      message: String((error as { message?: string } | null)?.message || error),
    };
  }
}
