"use client";

/**
 * Uploads one admin asset and returns its public `/site-assets/...` path.
 *
 * Small files keep going through the API route (it also compresses images).
 * Anything above the serverless body cap is sent straight to the asset host —
 * assets.santos.rs when the cPanel endpoint is configured, Supabase Storage
 * otherwise — so hero videos are no longer stuck at ~4.5MB.
 */

const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

async function uploadDirect(file: File): Promise<string> {
  const ticketRes = await fetch("/api/admin/webshop/site-assets/direct-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, size: file.size }),
  });
  const ticket = await ticketRes.json();
  if (!ticket?.success || !ticket?.signedUrl || !ticket?.url) {
    throw new Error(ticket?.message || "Upload nije uspeo");
  }

  const uploadRes = await fetch(ticket.signedUrl as string, {
    method: ticket.method === "POST" ? "POST" : "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadRes.ok) {
    let detail = "";
    try {
      detail = ((await uploadRes.json())?.error as string) || "";
    } catch {
      // Non-JSON error body (PHP fatal, proxy page) — status alone will do.
    }
    throw new Error(detail || `Upload nije uspeo (${uploadRes.status})`);
  }

  return ticket.url as string;
}

async function uploadViaApi(file: File): Promise<string> {
  const form = new FormData();
  form.append("files", file);
  const res = await fetch("/api/admin/webshop/site-assets", { method: "POST", body: form });
  const json = await res.json();
  if (!json?.success || !json?.urls?.[0]) {
    throw new Error(json?.message || "Upload nije uspeo");
  }
  return json.urls[0] as string;
}

export async function uploadAssetFile(file: File): Promise<string> {
  if (file.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
    return uploadDirect(file);
  }
  return uploadViaApi(file);
}
