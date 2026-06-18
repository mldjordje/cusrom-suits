const MAX_PRODUCT_VIDEO_SIZE_BYTES = 250 * 1024 * 1024;
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "m4v", "webm", "avi", "mpeg", "mpg"]);

export const PRODUCT_IMAGE_ACCEPT = "image/*";
export const PRODUCT_VIDEO_ACCEPT = "video/*";

type UploadFileMetadata = {
  name: string;
  type: string;
  size: number;
};

type AdminCommerceDraft = {
  isMoffice: boolean;
  priceOverride: boolean;
  priceGross: number | null;
  priceFinalGross: number | null;
  rebatePercent: number | null;
  stockWarehouse1: number | null;
  stockTotal: number | null;
};

type FetchProductUpdate = (url: string, init?: RequestInit) => Promise<Response>;

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

export function buildAdminCommercePatch(draft: AdminCommerceDraft) {
  if (draft.isMoffice) {
    return {
      priceOverride: draft.priceOverride,
      ...(draft.priceOverride
        ? {
            priceGross: draft.priceGross,
            priceFinalGross: draft.priceFinalGross,
            rebatePercent: draft.rebatePercent,
          }
        : {}),
    };
  }

  return {
    priceGross: draft.priceGross,
    priceFinalGross: draft.priceFinalGross,
    rebatePercent: draft.rebatePercent,
    stockWarehouse1: draft.stockWarehouse1,
    stockTotal: draft.stockTotal,
    priceOverride: draft.priceOverride,
  };
}

export async function persistUploadedProductVideo(
  legacyId: number,
  videoUrl: string,
  fetcher: FetchProductUpdate = fetch,
) {
  const response = await fetcher("/api/admin/webshop/products", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ legacyId, videoUrl }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Video je uploadovan, ali nije vezan za artikal.");
  }
}
