"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { isRemoteStorefrontImageSrc, sanitizeStorefrontImageSrc } from "@/lib/storefront/image-utils";

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
  const candidates = useMemo(() => {
    const normalized = [...sources, fallbackSrc]
      .map((value) => sanitizeStorefrontImageSrc(value))
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  }, [fallbackSrc, sources]);

  const [activeIndex, setActiveIndex] = useState(0);
  const requestedQuality = typeof props.quality === "number" ? props.quality : 75;
  const normalizedQuality = requestedQuality <= 64 ? 60 : 75;

  useEffect(() => {
    setActiveIndex(0);
  }, [candidates]);

  const activeSrc = candidates[Math.min(activeIndex, Math.max(candidates.length - 1, 0))] || fallbackSrc;
  const shouldBypassOptimization =
    props.unoptimized == null && isRemoteStorefrontImageSrc(activeSrc);

  return (
    <Image
      {...props}
      src={activeSrc}
      alt={alt}
      quality={normalizedQuality}
      unoptimized={shouldBypassOptimization ? true : props.unoptimized}
      onError={(event) => {
        onError?.(event);
        setActiveIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}
