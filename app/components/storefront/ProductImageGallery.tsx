"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [failedImageSrcs, setFailedImageSrcs] = useState<Set<string>>(() => new Set());
  const cleanImages = useMemo(
    () =>
      Array.from(
        new Set(
          images
            .map((img) => String(img || "").trim())
            .filter((img) => {
              if (!img.length) return false;
              // Exclude video files — they can't render as <img>
              return !/\.(mp4|webm|mov|avi|mpeg|mpg|m4v)(\?.*)?$/i.test(img);
            }),
        ),
      ),
    [images],
  );

  useEffect(() => {
    setFailedImageSrcs(new Set());
  }, [cleanImages]);

  const markImageFailed = useCallback((src: string) => {
    setFailedImageSrcs((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }, []);

  const gallery = useMemo<GalleryItem[]>(() => {
    const visibleImages = cleanImages.filter((src) => !failedImageSrcs.has(src));
    const cleanVideoUrl = String(videoUrl || "").trim();
    const items: GalleryItem[] = [];
    // Video goes FIRST so it autoplays as the hero on page load
    if (cleanVideoUrl) {
      items.push({
        kind: "video",
        src: cleanVideoUrl,
        thumbnail: visibleImages[0] || null,
        embedUrl: getYoutubeEmbedUrl(cleanVideoUrl),
      });
    }
    visibleImages.forEach((src) => items.push({ kind: "image", src }));
    return items;
  }, [cleanImages, failedImageSrcs, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { reduceMotion } = useAnimationBudget();
  const activeGallery = gallery;
  const activeItem = activeGallery[Math.min(activeIndex, Math.max(activeGallery.length - 1, 0))] || activeGallery[0];

  const imageItems = activeGallery.filter((item) => item.kind === "image");

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(activeGallery.length - 1, 0)));
  }, [activeGallery.length]);

  const openLightbox = useCallback((index: number) => {
    const imageIndex = activeGallery.slice(0, index + 1).filter((item) => item.kind === "image").length - 1;
    if (imageIndex >= 0) setLightboxIndex(imageIndex);
  }, [activeGallery]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const lightboxPrev = useCallback(() => {
    setLightboxIndex((i) => (i == null || i <= 0 ? imageItems.length - 1 : i - 1));
  }, [imageItems.length]);

  const lightboxNext = useCallback(() => {
    setLightboxIndex((i) => (i == null || i >= imageItems.length - 1 ? 0 : i + 1));
  }, [imageItems.length]);

  useEffect(() => {
    if (lightboxIndex == null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, closeLightbox, lightboxPrev, lightboxNext]);

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
              <button
                type="button"
                className="ss-product-gallery__main-image-btn"
                onClick={() => openLightbox(activeIndex)}
                aria-label="Otvori sliku u punom ekranu"
                style={{ display: "block", width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in" }}
              >
                <StorefrontSmartImage
                  sources={[activeItem.src]}
                  width={900}
                  height={1000}
                  alt={name}
                  className="ss-product-gallery__main-image"
                  priority
                  quality={78}
                  sizes="(max-width: 575px) 100vw, (max-width: 991px) 92vw, 58vw"
                  fallbackSrc=""
                  onError={() => markImageFailed(activeItem.src)}
                />
              </button>
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
                autoPlay
                muted
                playsInline
                loop
                preload="auto"
                className="ss-product-gallery__main-video"
                poster={activeItem.thumbnail || undefined}
              />
            )}
          </m.div>
        </AnimatePresence>
      </div>

      {lightboxIndex != null ? (
        <div
          className="ss-product-gallery__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Pregled slike"
          style={{
            position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.93)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            aria-label="Zatvori"
            style={{
              position: "absolute", top: 16, right: 20, background: "none", border: "none",
              color: "#fff", fontSize: 32, lineHeight: 1, cursor: "pointer", zIndex: 1,
            }}
          >
            ×
          </button>
          {imageItems.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                aria-label="Prethodna slika"
                style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                  fontSize: 28, lineHeight: 1, padding: "12px 16px", cursor: "pointer", borderRadius: 4,
                }}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                aria-label="Sledeća slika"
                style={{
                  position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                  fontSize: 28, lineHeight: 1, padding: "12px 16px", cursor: "pointer", borderRadius: 4,
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <div
            style={{ maxWidth: "90vw", maxHeight: "90vh", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            {imageItems[lightboxIndex] ? (
              <img
                src={(imageItems[lightboxIndex] as { kind: "image"; src: string }).src}
                alt={`${name} ${lightboxIndex + 1}`}
                style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", display: "block" }}
              />
            ) : null}
          </div>
          {imageItems.length > 1 ? (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
              {lightboxIndex + 1} / {imageItems.length}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeGallery.length > 1 ? (
        <div className="ss-product-gallery__thumbs" role="listbox" aria-label="Product media thumbnails">
          {activeGallery.map((item, index) => (
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
                  quality={64}
                  sizes="96px"
                  fallbackSrc=""
                  onError={() => markImageFailed(item.src)}
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
                      quality={64}
                      sizes="96px"
                      fallbackSrc=""
                      onError={() => item.thumbnail && markImageFailed(item.thumbnail)}
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
