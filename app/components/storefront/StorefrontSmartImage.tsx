"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";

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
      .map((value) => String(value || "").trim())
      .filter((value) => value.length > 0);

    return Array.from(new Set(normalized));
  }, [fallbackSrc, sources]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [candidates]);

  const activeSrc = candidates[Math.min(activeIndex, Math.max(candidates.length - 1, 0))] || fallbackSrc;

  return (
    <Image
      {...props}
      src={activeSrc}
      alt={alt}
      onError={(event) => {
        onError?.(event);
        setActiveIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}
