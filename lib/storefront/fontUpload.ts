import { ALLOWED_FONT_WEIGHTS, slugifyFontFamily, type FontWeight } from "@/lib/storefront/fontLibraryDefaults";

export const MAX_FONT_FILE_SIZE = 5 * 1024 * 1024;

type UploadInput = { name: string; type: string; size: number; bytes: Uint8Array; weight: string };
type UploadResult = { ok: true; weight: FontWeight } | { ok: false; message: string };

export const validateWoff2Upload = (input: UploadInput): UploadResult => {
  if (!ALLOWED_FONT_WEIGHTS.includes(input.weight as FontWeight)) return { ok: false, message: "Težina fonta nije podržana." };
  if (!input.name.toLowerCase().endsWith(".woff2")) return { ok: false, message: "Dozvoljeni su samo .woff2 fajlovi." };
  if (input.size <= 0 || input.size > MAX_FONT_FILE_SIZE) return { ok: false, message: "WOFF2 fajl može imati najviše 5 MB." };
  if (input.type && !["font/woff2", "application/font-woff2", "application/octet-stream"].includes(input.type)) return { ok: false, message: "Nepodržan MIME tip fonta." };
  const signature = Array.from(input.bytes.slice(0, 4));
  if (signature.join(",") !== "119,79,70,50") return { ok: false, message: "Fajl nema ispravan WOFF2 potpis." };
  return { ok: true, weight: input.weight as FontWeight };
};

export const buildUploadedFontStoragePath = (familyId: string, weight: FontWeight) =>
  `fonts/${slugifyFontFamily(familyId) || "font"}/${weight}.woff2`;
