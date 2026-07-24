import { createHash } from "crypto";

/**
 * Meta Conversions API — server-side purchase reporting.
 *
 * The browser pixel loses a large share of conversions to ad blockers and ITP,
 * so purchases are also reported from the server. Both hits carry the same
 * `event_id`, which is how Meta deduplicates them.
 *
 * Disabled unless META_CAPI_ACCESS_TOKEN and NEXT_PUBLIC_META_PIXEL_ID are set.
 */

const GRAPH_VERSION = "v21.0";

export type MetaCapiPurchase = {
  eventId: string;
  value: number;
  currency: string;
  contentIds: string[];
  numItems: number;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Meta requires normalised (trimmed, lowercased) values hashed with SHA-256. */
const hashed = (value: string | null | undefined) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized ? sha256(normalized) : undefined;
};

/** Phone numbers are hashed digits-only, with the country code kept. */
const hashedPhone = (value: string | null | undefined) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? sha256(digits) : undefined;
};

export const isMetaCapiConfigured = () =>
  Boolean(process.env.META_CAPI_ACCESS_TOKEN?.trim() && process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim());

export async function sendMetaCapiPurchase(input: MetaCapiPurchase) {
  if (!isMetaCapiConfigured()) return;

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID!.trim();
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN!.trim();
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();

  const userData: Record<string, unknown> = {
    em: hashed(input.email),
    ph: hashedPhone(input.phone),
    fn: hashed(input.firstName),
    ct: hashed(input.city),
    zp: hashed(input.postalCode),
    client_ip_address: input.clientIpAddress || undefined,
    client_user_agent: input.clientUserAgent || undefined,
  };

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        action_source: "website",
        event_source_url: input.eventSourceUrl || undefined,
        user_data: Object.fromEntries(
          Object.entries(userData).filter(([, value]) => value !== undefined),
        ),
        custom_data: {
          currency: input.currency,
          value: Number(input.value || 0),
          content_type: "product",
          content_ids: input.contentIds,
          num_items: input.numItems,
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      console.error("[meta-capi] purchase rejected:", res.status, await res.text().catch(() => ""));
    }
  } catch (error) {
    console.error("[meta-capi] purchase failed:", error instanceof Error ? error.message : error);
  }
}
