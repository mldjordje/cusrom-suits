import { NextResponse } from "next/server";
import sharp from "sharp";

const ALLOWED_HOST_SUFFIXES = [".supabase.co"];

type TileProfile = "default" | "stripe";
type TileQuality = "low" | "medium" | "high";

const isAllowedUrl = (value: string) => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return ALLOWED_HOST_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));
  } catch {
    return false;
  }
};

const normalizeProfile = (value: string | null): TileProfile => {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "stripe") return "stripe";
  return "default";
};

const normalizeQuality = (value: string | null): TileQuality => {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "high") return raw;
  return "medium";
};

const defaultSizeForProfile = (profile: TileProfile, quality: TileQuality) => {
  if (profile === "stripe") {
    if (quality === "high") return 112;
    if (quality === "low") return 80;
    return 96;
  }
  if (quality === "high") return 96;
  if (quality === "low") return 64;
  return 84;
};

const clampSize = (value: number, profile: TileProfile) => {
  const max = profile === "stripe" ? 256 : 192;
  return Math.min(max, Math.max(32, value));
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url")?.trim() ?? "";
  const profile = normalizeProfile(searchParams.get("profile"));
  const quality = normalizeQuality(searchParams.get("quality"));
  const requestedSize = Number.parseInt(searchParams.get("size") ?? "", 10);
  const tileSize = clampSize(
    Number.isFinite(requestedSize) ? requestedSize : defaultSizeForProfile(profile, quality),
    profile
  );

  if (!isAllowedUrl(raw)) {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const upstream = await fetch(raw, { cache: "force-cache", next: { revalidate: 86400 } });
  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  const bytes = Buffer.from(await upstream.arrayBuffer());
  const image = sharp(bytes, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? tileSize;
  const height = meta.height ?? tileSize;
  const side = Math.max(1, Math.min(width, height));
  const left = Math.max(0, Math.floor((width - side) / 2));
  const top = Math.max(0, Math.floor((height - side) / 2));

  let pipeline = image
    .extract({ left, top, width: side, height: side })
    .resize(tileSize, tileSize, {
      fit: "fill",
      kernel: profile === "stripe" ? sharp.kernel.lanczos3 : sharp.kernel.mitchell,
    });

  if (profile === "stripe") {
    // Stripe profile keeps woven lines crisp for preview, especially on phone uploads.
    const sharpenSigma = quality === "high" ? 1.45 : quality === "low" ? 0.95 : 1.2;
    const sharpenM1 = quality === "high" ? 1.9 : 1.5;
    const sharpenM2 = quality === "high" ? 2.5 : 2.2;
    pipeline = pipeline
      .removeAlpha()
      .normalize({ lower: 1, upper: 99 })
      .modulate({ brightness: 1.01, saturation: 1 })
      .sharpen(sharpenSigma, sharpenM1, sharpenM2);
  }

  const effort = quality === "high" ? 9 : quality === "low" ? 6 : 8;
  const tile = await pipeline.png({ compressionLevel: 9, effort }).toBuffer();

  return new Response(new Uint8Array(tile), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400, stale-while-revalidate=86400",
      "x-fabric-tile-profile": profile,
      "x-fabric-tile-quality": quality,
    },
  });
}
