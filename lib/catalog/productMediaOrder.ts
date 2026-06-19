export type ProductMediaItem = {
  kind: "image" | "video";
  src: string;
};

const mediaKey = (item: ProductMediaItem) => `${item.kind}:${item.src}`;

export const parseProductMediaOrder = (value: unknown): ProductMediaItem[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: ProductMediaItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const kind = row.kind === "image" || row.kind === "video" ? row.kind : null;
    const src = String(row.src || "").trim();
    if (!kind || !src) continue;
    const item = { kind, src } satisfies ProductMediaItem;
    const key = mediaKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

export const resolveProductMediaOrder = (
  images: Array<string | null | undefined>,
  videoUrl: string | null | undefined,
  storedOrder: unknown,
): ProductMediaItem[] => {
  const available = parseProductMediaOrder([
    ...(String(videoUrl || "").trim() ? [{ kind: "video", src: videoUrl }] : []),
    ...images.map((src) => ({ kind: "image", src })),
  ]);
  const availableByKey = new Map(available.map((item) => [mediaKey(item), item]));
  const result: ProductMediaItem[] = [];
  const included = new Set<string>();

  for (const item of parseProductMediaOrder(storedOrder)) {
    const key = mediaKey(item);
    const current = availableByKey.get(key);
    if (!current || included.has(key)) continue;
    included.add(key);
    result.push(current);
  }

  for (const item of available) {
    const key = mediaKey(item);
    if (included.has(key)) continue;
    included.add(key);
    result.push(item);
  }

  return result;
};
