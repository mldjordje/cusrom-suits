"use client";
import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import {
  isSupabaseStorageImageSrc,
  sanitizeStorefrontImageSrc,
  storefrontImageVariantSrc,
  withStorefrontImageCacheVersion,
} from "@/lib/storefront/image-utils";

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
  const requestedQuality = typeof props.quality === "number" ? props.quality : 75;
  const layoutWidth =
    typeof props.width === "number" && !("fill" in props && props.fill) ? props.width : null;

  // Each source expands to [size variant, original]. If the variant has not
  // been generated for this image yet, onError falls straight through to the
  // original rather than to a different product's photo.
  const candidates = Array.from(
    new Set(
      [...sources, fallbackSrc]
        .map((value) => sanitizeStorefrontImageSrc(value))
        .flatMap((value) => [storefrontImageVariantSrc(value, layoutWidth), value])
        .filter((value) => value.length > 0)
        .map((value) => withStorefrontImageCacheVersion(value)),
    ),
  );

  const [index, setIndex] = useState(0);
  const activeSrc = candidates[index] || fallbackSrc;

  const handleError = useCallback(() => {
    // Try the next candidate; if exhausted, stay on the last one (local fallback)
    setIndex((prev) => Math.min(prev + 1, candidates.length - 1));
  }, [candidates.length]);

  const normalizedQuality = requestedQuality <= 64 ? 60 : 75;
  const normalizedSizes =
    props.sizes ??
    (typeof props.width === "number" && !("fill" in props && props.fill) ? `${props.width}px` : undefined);
  const shouldBypassOptimization =
    props.unoptimized == null &&
    (activeSrc.startsWith("data:image/") ||
      activeSrc.toLowerCase().includes(".svg") ||
      isSupabaseStorageImageSrc(activeSrc));

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
