import { NextResponse } from "next/server";
import sharp from "sharp";

const ALLOWED_HOST_SUFFIXES = [".supabase.co"];

type TileProfile = "default" | "stripe" | "tailored-stripe";
type TileQuality = "low" | "medium" | "high";
type StripeOrientation = "vertical" | "horizontal";

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
  if (raw === "tailored-stripe") return "tailored-stripe";
  if (raw === "stripe") return "stripe";
  return "default";
};

const normalizeQuality = (value: string | null): TileQuality => {
  const raw = (value ?? "").trim().toLowerCase();
  if (raw === "low" || raw === "high") return raw;
  return "medium";
};

const normalizeOrientation = (value: string | null): StripeOrientation => {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "horizontal" ? "horizontal" : "vertical";
};

const defaultSizeForProfile = (profile: TileProfile, quality: TileQuality) => {
  if (profile === "stripe" || profile === "tailored-stripe") {
    if (quality === "high") return 112;
    if (quality === "low") return 80;
    return 96;
  }
  if (quality === "high") return 96;
  if (quality === "low") return 64;
  return 84;
};

const clampSize = (value: number, profile: TileProfile) => {
  const max = profile === "stripe" || profile === "tailored-stripe" ? 256 : 192;
  return Math.min(max, Math.max(32, value));
};

/**
 * Homomorphic illumination flatten. A factory phone photo of a swatch carries an
 * uneven lighting gradient (bright center / dark corners, hotspots). Tiled as-is it
 * produces a repeating blotch grid that reads as fake. We estimate the low-frequency
 * illumination with a heavy blur and divide it out per channel, normalising every
 * pixel toward the swatch mean while preserving the high-frequency weave. `strength`
 * blends toward the original so we never fully flatten genuine tonal variation.
 */
const flattenIllumination = async (
  img: sharp.Sharp,
  size: number,
  strength = 0.78
): Promise<sharp.Sharp> => {
  const base = img.clone().removeAlpha().toColourspace("srgb");
  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  if (ch < 3) return img;
  const sigma = Math.max(2, size / 6);
  const blur = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .blur(sigma)
    .raw()
    .toBuffer();

  // Global mean luminance as the flat-field target.
  let lumSum = 0;
  const px = info.width * info.height;
  for (let i = 0; i < px; i++) {
    const o = i * ch;
    lumSum += 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
  }
  const targetLum = lumSum / px;

  const out = Buffer.alloc(data.length);
  const EPS = 1e-3;
  for (let i = 0; i < px; i++) {
    const o = i * ch;
    const lowLum = 0.2126 * blur[o] + 0.7152 * blur[o + 1] + 0.0722 * blur[o + 2];
    // Correction ratio, eased by strength so we don't over-flatten.
    const ratio = targetLum / (lowLum + EPS);
    const factor = 1 + (ratio - 1) * strength;
    for (let c = 0; c < ch; c++) {
      out[o + c] = Math.max(0, Math.min(255, Math.round(data[o + c] * factor)));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: ch } });
};

/**
 * Rectify a real stripe swatch into a clean, even pinstripe tile for the geometry engine.
 *
 * A phone photo of a stripe carries sensor noise, JPEG blocking and a lighting gradient
 * that the geometry engine then magnifies (it samples the tile at sub-pixel through UV).
 * We collapse the swatch along the stripe's CONSTANT axis — for a vertical stripe the
 * colour is (ideally) constant down each column, so we average every column into a 1-D
 * profile, smooth it, and re-broadcast it across the tile. Noise that doesn't follow the
 * stripe direction averages out; the stripe lines stay razor-sharp.
 *
 * `orientation === "horizontal"` transposes the logic (collapse rows -> per-row profile).
 * Brightness lift is tone-adaptive: dark fabrics get a small pop, light fabrics are left
 * near-identity so they don't wash out (the old hard 1.12 lift blew out light stripes —
 * the reason rectify was previously gated to dark tone only).
 */
const rectifyStripe = async (
  img: sharp.Sharp,
  size: number,
  orientation: StripeOrientation = "vertical"
): Promise<sharp.Sharp> => {
  const { data, info } = await img.clone().removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  if (ch < 3) return img.removeAlpha();
  const width = info.width;
  const height = info.height;
  // Vertical stripe => the stripe profile runs across X (one bin per column), averaged
  // down Y. Horizontal stripe => one bin per row, averaged across X.
  const vertical = orientation !== "horizontal";
  const binCount = vertical ? width : height;
  const binOf = (x: number, y: number) => (vertical ? x : y);
  const lines = Array.from({ length: binCount }, () => [0, 0, 0]);
  const global = [0, 0, 0];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * ch;
      const b = binOf(x, y);
      for (let c = 0; c < 3; c++) {
        lines[b][c] += data[o + c];
        global[c] += data[o + c];
      }
    }
  }

  const px = width * height;
  const span = vertical ? height : width;
  for (let c = 0; c < 3; c++) global[c] /= px;
  for (let b = 0; b < binCount; b++) {
    for (let c = 0; c < 3; c++) lines[b][c] /= span;
  }

  const smoothLines = lines.map((_, b) => {
    const acc = [0, 0, 0];
    let weightSum = 0;
    for (let db = -2; db <= 2; db++) {
      const bb = (b + db + binCount) % binCount;
      const w = db === 0 ? 3 : Math.abs(db) === 1 ? 2 : 1;
      for (let c = 0; c < 3; c++) acc[c] += lines[bb][c] * w;
      weightSum += w;
    }
    return acc.map((v) => v / weightSum);
  });

  const out = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const source = (y * width + x) * ch;
      const target = (y * width + x) * 3;
      const b = binOf(x, y);
      for (let c = 0; c < 3; c++) {
        const lineSignal = global[c] + (smoothLines[b][c] - global[c]) * 1.28;
        const micro = data[source + c] - lines[b][c];
        out[target + c] = Math.max(0, Math.min(255, Math.round(lineSignal + micro * 0.04)));
      }
    }
  }

  // Tone-adaptive lift: dark (~50 luma) -> ~1.13, mid -> ~1.05, light (~200) -> ~0.99.
  const globalLum = 0.2126 * global[0] + 0.7152 * global[1] + 0.0722 * global[2];
  const lift = Math.max(0.98, Math.min(1.15, 1.0 + (150 - globalLum) / 750));

  return sharp(out, { raw: { width, height, channels: 3 } })
    .blur(Math.max(0.3, size / 900))
    .modulate({ saturation: 1.02, brightness: lift });
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url")?.trim() ?? "";
  const profile = normalizeProfile(searchParams.get("profile"));
  const quality = normalizeQuality(searchParams.get("quality"));
  const orientation = normalizeOrientation(searchParams.get("orientation"));
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

  const cropped = image
    .extract({ left, top, width: side, height: side })
    .resize(tileSize, tileSize, {
      fit: "fill",
      kernel: profile === "stripe" ? sharp.kernel.lanczos3 : sharp.kernel.mitchell,
    });

  // Flatten the swatch lighting for every profile so any phone upload tiles evenly
  // and yields an accurate average colour, not just stripe fabrics.
  let pipeline = await flattenIllumination(
    cropped,
    tileSize,
    profile === "stripe" || profile === "tailored-stripe" ? 0.7 : 0.82
  );

  if (profile === "tailored-stripe" || profile === "stripe") {
    // Both stripe profiles now rectify: collapse the swatch along the stripe's constant
    // axis so phone-photo noise/blocking averages out and the lines stay razor-clean for
    // the geometry engine (which magnifies any residual grain when it samples through UV).
    // `tailored-stripe` is the clean result as-is; `stripe` adds a mild unsharp pass to
    // keep lighter-tone weave crisp. Sharpen kept gentle — at these tile sizes a strong
    // unsharp-mask rings/aliases when the engine minifies the tile.
    pipeline = await rectifyStripe(pipeline, tileSize, orientation);
    if (profile === "stripe") {
      const sharpenSigma = quality === "high" ? 0.9 : quality === "low" ? 0.65 : 0.8;
      const sharpenM1 = quality === "high" ? 1.0 : 0.85;
      const sharpenM2 = quality === "high" ? 1.3 : 1.1;
      pipeline = pipeline.sharpen(sharpenSigma, sharpenM1, sharpenM2);
    }
  } else {
    // Default profile: flatten only. No percentile `normalize` — on an already-even
    // swatch a contrast stretch amplifies residual low-frequency differences and skews
    // colour. The homomorphic flatten is self-limiting (near-identity on even photos).
    pipeline = pipeline.removeAlpha();
  }

  const effort = quality === "high" ? 9 : quality === "low" ? 6 : 8;
  const tile = await pipeline.png({ compressionLevel: 9, effort }).toBuffer();

  return new Response(new Uint8Array(tile), {
    status: 200,
    headers: {
      "content-type": "image/png",
      // Browser: 24 h cache
      "cache-control": "public, max-age=86400, stale-while-revalidate=86400",
      // Vercel CDN: cache at edge for 7 days — processed tile never re-fetched from Supabase
      "cdn-cache-control": "public, max-age=604800, stale-while-revalidate=86400",
      "vercel-cdn-cache-control": "public, max-age=604800, stale-while-revalidate=86400",
      "x-fabric-tile-profile": profile,
      "x-fabric-tile-quality": quality,
    },
  });
}
