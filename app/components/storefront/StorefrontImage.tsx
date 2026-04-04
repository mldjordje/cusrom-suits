import Image, { type ImageProps } from "next/image";
import { isRemoteStorefrontImageSrc, sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";

type StorefrontImageProps = Omit<ImageProps, "src" | "alt"> & {
  alt: string;
  sources: string[];
  fallbackSrc?: string;
};

export default function StorefrontImage({
  alt,
  sources,
  fallbackSrc = "/img/odela.jpg",
  ...props
}: StorefrontImageProps) {
  const candidates = [...sources, fallbackSrc]
    .map((value) => sanitizeStorefrontImageSrc(value))
    .filter((value) => value.length > 0);
  const activeSrc = candidates[0] || fallbackSrc;
  const requestedQuality = typeof props.quality === "number" ? props.quality : 75;
  const normalizedQuality = requestedQuality <= 64 ? 60 : 75;
  const normalizedSizes =
    props.sizes ??
    (typeof props.width === "number" && !("fill" in props && props.fill) ? `${props.width}px` : undefined);
  const shouldBypassOptimization =
    props.unoptimized == null &&
    (activeSrc.startsWith("data:image/") ||
      isRemoteStorefrontImageSrc(activeSrc) ||
      activeSrc.toLowerCase().includes(".svg") ||
      (isRemoteStorefrontImageSrc(activeSrc) && activeSrc.toLowerCase().includes(".svg")));

  return (
    <Image
      {...props}
      src={activeSrc}
      alt={alt}
      quality={normalizedQuality}
      sizes={normalizedSizes}
      unoptimized={shouldBypassOptimization ? true : props.unoptimized}
    />
  );
}
