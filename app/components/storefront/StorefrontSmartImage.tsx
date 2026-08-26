"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  isSupabaseStorageImageSrc,
  sanitizeStorefrontImageSrc,
  storefrontImageVariantSrc,
  withStorefrontImageCacheVersion,
} from "@/lib/storefront/image-utils";

type StorefrontSmartImageProps = Omit<ImageProps, "src" | "alt"> & {
  alt: string;
  sources: string[];
  fallbackSrc?: string;
};

export default function StorefrontSmartImage({
  alt,
  sources,
  fallbackSrc = "/img/odela.jpg",
  onError,
  ...props
}: StorefrontSmartImageProps) {
  const requestedQuality = typeof props.quality === "number" ? props.quality : 75;
  const layoutWidth =
    typeof props.width === "number" && !("fill" in props && props.fill) ? props.width : null;

  const candidates = useMemo(() => {
    const rawCandidates = fallbackSrc ? [...sources, fallbackSrc] : sources;
    // Each source expands to [size variant, original], so an image whose
    // variant has not been generated yet falls back to its own full-size file.
    const normalized = rawCandidates
      .map((value) => sanitizeStorefrontImageSrc(value))
      .flatMap((value) => [storefrontImageVariantSrc(value, layoutWidth), value])
      .filter((value) => value.length > 0)
      .map((value) => withStorefrontImageCacheVersion(value));

    return Array.from(new Set(normalized));
  }, [fallbackSrc, sources, layoutWidth]);

  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuality = requestedQuality <= 64 ? 60 : 75;
  const normalizedSizes =
    props.sizes ??
    (typeof props.width === "number" && !("fill" in props && props.fill) ? `${props.width}px` : undefined);

  useEffect(() => {
    setActiveIndex(0);
  }, [candidates]);

  const activeSrc = candidates[Math.min(activeIndex, Math.max(candidates.length - 1, 0))] || fallbackSrc;
  // Bypass Vercel's /_next/image optimizer for Supabase Storage URLs — they are
  // already public and directly accessible, and going through the optimizer burns
  // the monthly source-image quota (resulting in 402 errors for new uploads).
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
      onError={(event) => {
        onError?.(event);
        setActiveIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}
