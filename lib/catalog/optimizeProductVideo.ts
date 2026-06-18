import { validateProductVideoUpload } from "@/lib/catalog/productMediaUpload";

export type ProductVideoOptimizationProgress = (progress: number) => void;

export async function optimizeProductVideo(
  file: File,
  onProgress?: ProductVideoOptimizationProgress,
): Promise<File> {
  const validationError = validateProductVideoUpload(file);
  if (validationError) throw new Error(validationError);

  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const conversion = await Conversion.init({
    input,
    output,
    tracks: "primary",
    video: { codec: "avc" },
    audio: {
      codec: "aac",
    },
    showWarnings: false,
  });

  if (!conversion.isValid) {
    throw new Error("Ovaj uređaj ne podržava optimizaciju izabranog video formata.");
  }

  conversion.onProgress = (progress) => onProgress?.(Math.max(0, Math.min(1, progress)));
  await conversion.execute();
  if (!target.buffer) throw new Error("Optimizacija videa nije napravila izlazni fajl.");

  const baseName = file.name.replace(/\.[^.]+$/, "") || "product-video";
  return new File([target.buffer], `${baseName}.mp4`, { type: "video/mp4", lastModified: Date.now() });
}
