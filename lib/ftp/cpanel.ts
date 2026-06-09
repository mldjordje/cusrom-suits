/**
 * Upload files to cPanel via the PHP upload endpoint at assets.santos.rs.
 * Much more reliable than FTP from serverless — just plain HTTP POST.
 *
 * Required Vercel env vars:
 *   PHP_UPLOAD_URL   — e.g. https://assets.santos.rs/site-upload.php
 *   PHP_UPLOAD_TOKEN — secret token matching UPLOAD_SECRET on the cPanel server
 */

const PHP_UPLOAD_URL   = process.env.PHP_UPLOAD_URL   || "";
const PHP_UPLOAD_TOKEN = process.env.PHP_UPLOAD_TOKEN || "";

export function isFtpConfigured() {
  return Boolean(PHP_UPLOAD_URL && PHP_UPLOAD_TOKEN);
}

export async function uploadViaCpanel(
  fileBuffer: Buffer,
  remoteName: string,
  subDir: string,
): Promise<string> {
  if (!PHP_UPLOAD_URL || !PHP_UPLOAD_TOKEN) {
    throw new Error("PHP_UPLOAD_URL / PHP_UPLOAD_TOKEN not configured");
  }

  const url = `${PHP_UPLOAD_URL}?subdir=${encodeURIComponent(subDir)}&filename=${encodeURIComponent(remoteName)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-Upload-Token": PHP_UPLOAD_TOKEN,
      "Content-Type": "application/octet-stream",
    },
    body: new Uint8Array(fileBuffer),
  });

  const text = await res.text();

  if (!res.ok) {
    let detail = text;
    try { detail = JSON.parse(text)?.error || text; } catch (_) {}
    throw new Error(`PHP upload failed (${res.status}): ${detail}`);
  }

  let data: { url?: string; error?: string };
  try { data = JSON.parse(text); } catch (_) {
    throw new Error(`Invalid PHP response: ${text.slice(0, 200)}`);
  }

  if (data.error) throw new Error(data.error);
  if (!data.url)  throw new Error("PHP response missing url field");

  return data.url;
}
