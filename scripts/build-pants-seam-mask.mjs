import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const PANTS_CANVAS = { w: 600, h: 350 };
const SRC = path.join(projectRoot, "stripe reference.png");
const OUT_DIR = path.join(projectRoot, "public", "assets", "suits", "masks");
const OUT = path.join(OUT_DIR, "pants_seam.png");

const isBlue = (r, g, b, a) => {
  if (a < 32) return false;
  if (b < 120) return false;
  if (r > 90 || g > 110) return false;
  return b - Math.max(r, g) > 25;
};

const ensureDir = async (dir) => {
  await sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  await import("fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
};

const run = async () => {
  await ensureDir(OUT_DIR);
  const source = sharp(SRC).trim({ threshold: 8 });
  const resized = source.resize(PANTS_CANVAS.w, PANTS_CANVAS.h, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
  const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = info.channels > 3 ? data[idx + 3] : 255;
      const outIdx = (y * info.width + x) * 4;
      if (isBlue(r, g, b, a)) {
        out[outIdx] = 255;
        out[outIdx + 1] = 255;
        out[outIdx + 2] = 255;
        out[outIdx + 3] = 255;
      } else {
        out[outIdx] = 0;
        out[outIdx + 1] = 0;
        out[outIdx + 2] = 0;
        out[outIdx + 3] = 0;
      }
    }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toFile(OUT);
  console.log("Wrote", OUT);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
