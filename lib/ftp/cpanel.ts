import * as ftp from "basic-ftp";
import path from "path";

const FTP_HOST = process.env.FTP_HOST || "";
const FTP_USER = process.env.FTP_USER || "";
const FTP_PASS = process.env.FTP_PASS || "";
const FTP_PORT = parseInt(process.env.FTP_PORT || "21", 10);
const FTP_REMOTE_BASE =
  process.env.FTP_REMOTE_BASE || "/home/agyc3416/public_html/fajlovi/site-assets";

export function isFtpConfigured() {
  return Boolean(FTP_HOST && FTP_USER && FTP_PASS);
}

export async function uploadViaCpanel(
  fileBuffer: Buffer,
  remoteName: string,
  subDir: string,
): Promise<string | null> {
  if (!isFtpConfigured()) return null;

  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASS,
      port: FTP_PORT,
      secure: false,
    });

    const remoteDir = `${FTP_REMOTE_BASE}/${subDir}`.replace(/\/+/g, "/");
    await client.ensureDir(remoteDir);

    const { Readable } = await import("stream");
    const stream = Readable.from(fileBuffer);
    await client.uploadFrom(stream, `${remoteDir}/${remoteName}`);

    return `/fajlovi/site-assets/${subDir}/${remoteName}`;
  } catch (err) {
    console.error("[FTP] upload failed:", err);
    return null;
  } finally {
    client.close();
  }
}
