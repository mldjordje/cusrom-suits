const MAX_PRODUCT_VIDEO_SIZE_BYTES = 250 * 1024 * 1024;
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "avi", "mpeg", "mpg"]);

export const PRODUCT_IMAGE_ACCEPT = "image/*";
export const PRODUCT_VIDEO_ACCEPT = "video/*";

type UploadFileMetadata = {
  name: string;
  type: string;
  size: number;
};

const sanitizeFileName = (value: string) =>
  String(value || "video")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "video";

export function validateProductVideoUpload(file: UploadFileMetadata): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (!file.type.toLowerCase().startsWith("video/") && !VIDEO_EXTENSIONS.has(extension)) {
    return `"${file.name}" nije podržan video fajl.`;
  }
  if (file.size <= 0) return `"${file.name}" je prazan fajl.`;
  if (file.size > MAX_PRODUCT_VIDEO_SIZE_BYTES) return `"${file.name}" prelazi limit od 250MB.`;
  return null;
}

export function buildProductVideoStoragePath(name: string, id: string, now = new Date()) {
  const date = now.toISOString().slice(0, 10);
  return `webshop/videos/${date}/${sanitizeFileName(id)}-${sanitizeFileName(name)}.mp4`;
}
