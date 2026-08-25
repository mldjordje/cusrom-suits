"use client";
import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { sanitizeStorefrontImageSrc, withStorefrontImageCacheVersion } from "@/lib/storefront/image-utils";

type StorefrontImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
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
    .map((value) => withStorefrontImageCacheVersion(sanitizeStorefrontImageSrc(value)))
    .filter((value) => value.length > 0);

  const [index, setIndex] = useState(0);
  const activeSrc = candidates[index] || fallbackSrc;

  const handleError = useCallback(() => {
    // Try the next candidate; if exhausted, stay on the last one (local fallback)
    setIndex((prev) => Math.min(prev + 1, candidates.length - 1));
  }, [candidates.length]);

  const requestedQuality = typeof props.quality === "number" ? props.quality : 75;
  const normalizedQuality = requestedQuality <= 64 ? 60 : 75;
  const normalizedSizes =
    props.sizes ??
    (typeof props.width === "number" && !("fill" in props && props.fill) ? `${props.width}px` : undefined);
  const shouldBypassOptimization =
    props.unoptimized == null &&
    (activeSrc.startsWith("data:image/") ||
      activeSrc.toLowerCase().includes(".svg"));

  return (
    <Image
      {...props}
      src={activeSrc}
      alt={alt}
      quality={normalizedQuality}
      sizes={normalizedSizes}
      unoptimized={shouldBypassOptimization ? true : props.unoptimized}
      onError={handleError}
    />
  );
}
