import * as ftp from "basic-ftp";
import { writeFile, unlink } from "fs/promises";
import os from "os";
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

/** Uploads a buffer to cPanel via FTP. Returns the public /fajlovi/... path or throws on failure. */
export async function uploadViaCpanel(
  fileBuffer: Buffer,
  remoteName: string,
  subDir: string,
): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `ftp-${Date.now()}-${remoteName}`);
  await writeFile(tmpPath, fileBuffer);

  const client = new ftp.Client(30000);
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
    await client.uploadFrom(tmpPath, `${remoteDir}/${remoteName}`);

    return `/fajlovi/site-assets/${subDir}/${remoteName}`;
  } finally {
    client.close();
    unlink(tmpPath).catch(() => {});
  }
}
