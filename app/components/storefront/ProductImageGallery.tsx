"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";

type ProductImageGalleryProps = {
  images: string[];
  name: string;
  videoUrl?: string | null;
};

type GalleryItem =
  | {
      kind: "image";
      src: string;
    }
  | {
      kind: "video";
      src: string;
      thumbnail: string | null;
      embedUrl: string | null;
    };

const getYoutubeEmbedUrl = (value: string) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.replace(/\//g, "").trim();
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const id = url.searchParams.get("v") || url.pathname.split("/").filter(Boolean).pop() || "";
      return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null;
    }
  } catch {
    return null;
  }

  return null;
};

export default function ProductImageGallery({ images, name, videoUrl }: ProductImageGalleryProps) {
  const gallery = useMemo<GalleryItem[]>(() => {
    const cleanImages = Array.from(
      new Set(images.map((img) => String(img || "").trim()).filter((img) => img.length > 0)),
    );
    const items: GalleryItem[] = cleanImages.map((src) => ({ kind: "image", src }));
    const cleanVideoUrl = String(videoUrl || "").trim();
    if (cleanVideoUrl) {
      items.push({
        kind: "video",
        src: cleanVideoUrl,
        thumbnail: cleanImages[0] || null,
        embedUrl: getYoutubeEmbedUrl(cleanVideoUrl),
      });
    }
    return items;
  }, [images, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const { reduceMotion } = useAnimationBudget();
  const activeItem = gallery[activeIndex] || gallery[0];
  if (!activeItem) return null;

  return (
    <div className="ss-product-gallery">
      <div className="ss-product-gallery__main">
        <AnimatePresence mode="wait">
          <m.div
            key={`${activeItem.kind}-${activeItem.src}`}
            className="w-100 h-100"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.01 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
            transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeItem.kind === "image" ? (
              <StorefrontSmartImage
                sources={[activeItem.src, ...gallery.filter((item) => item.kind === "image").map((item) => item.src)]}
                width={900}
                height={1000}
                alt={name}
                className="ss-product-gallery__main-image"
                priority
                unoptimized
                quality={78}
                sizes="(max-width: 575px) 100vw, (max-width: 991px) 92vw, 58vw"
              />
            ) : activeItem.embedUrl ? (
              <iframe
                src={activeItem.embedUrl}
                title={`${name} video`}
                className="ss-product-gallery__main-video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={activeItem.src}
                controls
                playsInline
                preload="metadata"
                className="ss-product-gallery__main-video"
                poster={activeItem.thumbnail || undefined}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {gallery.length > 1 ? (
        <div className="ss-product-gallery__thumbs" role="listbox" aria-label="Product media thumbnails">
          {gallery.map((item, index) => (
            <m.button
              key={`${item.kind}-${item.src}-${index}`}
              type="button"
              className={`ss-product-gallery__thumb ${activeIndex === index ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={item.kind === "video" ? `Show video ${index + 1}` : `Show image ${index + 1}`}
              aria-pressed={activeIndex === index}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            >
              {item.kind === "image" ? (
                <StorefrontSmartImage
                  sources={[item.src]}
                  width={96}
                  height={112}
                  alt={`${name} thumbnail ${index + 1}`}
                  className="ss-product-gallery__thumb-image"
                  unoptimized
                  quality={64}
                  sizes="96px"
                  fallbackSrc="/img/odela.jpg"
                />
              ) : (
                <div className="ss-product-gallery__thumb-video">
                  {item.thumbnail ? (
                    <StorefrontSmartImage
                      sources={[item.thumbnail]}
                      width={96}
                      height={112}
                      alt={`${name} video thumbnail ${index + 1}`}
                      className="ss-product-gallery__thumb-image"
                      unoptimized
                      quality={64}
                      sizes="96px"
                      fallbackSrc="/img/odela.jpg"
                    />
                  ) : (
                    <span className="ss-product-gallery__thumb-video-label">VIDEO</span>
                  )}
                  <span className="ss-product-gallery__thumb-play" aria-hidden>
                    ►
                  </span>
                </div>
              )}
            </m.button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
