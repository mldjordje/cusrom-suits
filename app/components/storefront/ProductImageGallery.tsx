"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import useAnimationBudget from "@/app/components/motion/useAnimationBudget";
import StorefrontSmartImage from "@/app/components/storefront/StorefrontSmartImage";
import type { ProductMediaItem } from "@/lib/catalog/productMediaOrder";

type ProductImageGalleryProps = {
  images: string[];
  name: string;
  videoUrl?: string | null;
  media?: ProductMediaItem[];
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

export default function ProductImageGallery({ images, name, videoUrl, media }: ProductImageGalleryProps) {
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
    const visibleImageSet = new Set(visibleImages);
    const orderedMedia = media?.length
      ? media
      : [
          ...(cleanVideoUrl ? [{ kind: "video" as const, src: cleanVideoUrl }] : []),
          ...visibleImages.map((src) => ({ kind: "image" as const, src })),
        ];
    const items: GalleryItem[] = [];
    for (const item of orderedMedia) {
      if (item.kind === "image") {
        if (visibleImageSet.has(item.src)) items.push({ kind: "image", src: item.src });
        continue;
      }
      if (cleanVideoUrl && item.src === cleanVideoUrl) {
        items.push({
          kind: "video",
          src: cleanVideoUrl,
          thumbnail: visibleImages[0] || null,
          embedUrl: getYoutubeEmbedUrl(cleanVideoUrl),
        });
      }
    }
    return items;
  }, [cleanImages, failedImageSrcs, media, videoUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { reduceMotion } = useAnimationBudget();
  const activeGallery = gallery;
  const activeItem = activeGallery[Math.min(activeIndex, Math.max(activeGallery.length - 1, 0))] || activeGallery[0];
  const isDraggingRef = useRef(false);

  const imageItems = activeGallery.filter((item) => item.kind === "image");

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(activeGallery.length - 1, 0)));
  }, [activeGallery.length]);

  const goToNext = useCallback(() => {
    if (activeGallery.length <= 1) return;
    setDirection(1);
    setActiveIndex((prev) => (prev + 1) % activeGallery.length);
  }, [activeGallery.length]);

  const goToPrev = useCallback(() => {
    if (activeGallery.length <= 1) return;
    setDirection(-1);
    setActiveIndex((prev) => (prev - 1 + activeGallery.length) % activeGallery.length);
  }, [activeGallery.length]);

  const handleSelectIndex = useCallback(
    (index: number) => {
      setDirection(index > activeIndex ? 1 : -1);
      setActiveIndex(index);
    },
    [activeIndex],
  );

  const openLightbox = useCallback((index: number) => {
    const imageIndex = activeGallery.slice(0, index + 1).filter((item) => item.kind === "image").length - 1;
    if (imageIndex >= 0) setLightboxIndex(imageIndex);
  }, [activeGallery]);

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  /* Zoom inside the lightbox. Pointer-driven, so it is desktop-only in
     practice: the wheel handler is the entry point and touch keeps the
     browser's own pinch-zoom. Scale and pan live in state; the transform is
     the only thing that changes, so the browser never re-layouts. */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const zoomFrameRef = useRef<HTMLDivElement | null>(null);

  const MAX_ZOOM = 4;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  /* Reset whenever the lightbox opens, closes or swaps image — carrying a pan
     offset over to a differently-sized photo leaves it parked off screen. */
  useEffect(() => {
    resetZoom();
  }, [lightboxIndex, resetZoom]);

  /* Anchor the zoom at the cursor: the point under the pointer has to stay
     under it, otherwise zooming walks the image away from what you aimed at. */
  const zoomAt = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const frame = zoomFrameRef.current;
    const clamped = Math.min(MAX_ZOOM, Math.max(1, nextZoom));

    setZoom((currentZoom) => {
      if (clamped === currentZoom) return currentZoom;
      if (clamped === 1) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      if (frame) {
        const rect = frame.getBoundingClientRect();
        const offsetX = clientX - (rect.left + rect.width / 2);
        const offsetY = clientY - (rect.top + rect.height / 2);
        const ratio = clamped / currentZoom;
        setPan((currentPan) => ({
          x: offsetX - (offsetX - currentPan.x) * ratio,
          y: offsetY - (offsetY - currentPan.y) * ratio,
        }));
      }
      return clamped;
    });
  }, []);

  /* Registered natively rather than via onWheel: React attaches wheel
     listeners as passive, so preventDefault there is a no-op and the page
     scrolls behind the lightbox while zooming. */
  useEffect(() => {
    const frame = zoomFrameRef.current;
    if (lightboxIndex == null || !frame) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0018);
      zoomAt(zoom * factor, event.clientX, event.clientY);
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [lightboxIndex, zoom, zoomAt]);

  const handleZoomPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      event.preventDefault();
      panStartRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pan.x, pan.y, zoom],
  );

  const handleZoomPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = panStartRef.current;
    if (!start) return;
    setPan({ x: start.panX + (event.clientX - start.x), y: start.panY + (event.clientY - start.y) });
  }, []);

  const handleZoomPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!panStartRef.current) return;
    panStartRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const handleZoomDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      zoomAt(zoom > 1 ? 1 : 2.5, event.clientX, event.clientY);
    },
    [zoom, zoomAt],
  );

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

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
  ) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 80);

    const swipeThreshold = 35;
    const velocityThreshold = 250;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      goToNext();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      goToPrev();
    }
  };

  const carouselVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? "100%" : dir < 0 ? "-100%" : 0,
      opacity: reduceMotion ? 1 : 0.4,
      scale: reduceMotion ? 1 : 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? "-100%" : dir < 0 ? "100%" : 0,
      opacity: reduceMotion ? 1 : 0.4,
      scale: reduceMotion ? 1 : 0.98,
    }),
  };

  if (!activeItem) return null;

  return (
    <div className="ss-product-gallery">
      <div className="ss-product-gallery__main">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <m.div
            key={`${activeItem.kind}-${activeItem.src}`}
            className="w-100 h-100 ss-product-gallery__slide"
            custom={direction}
            variants={carouselVariants}
            initial="enter"
            animate="center"
            exit="exit"
            drag={activeGallery.length > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.24}
            dragDirectionLock={true}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32 },
              opacity: { duration: 0.28 },
              scale: { duration: 0.28 },
            }}
          >
            {activeItem.kind === "image" ? (
              <button
                type="button"
                className="ss-product-gallery__main-image-btn"
                onClick={() => {
                  if (isDraggingRef.current) return;
                  openLightbox(activeIndex);
                }}
                aria-label="Otvori sliku u punom ekranu"
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  padding: 0,
                  border: "none",
                  background: "none",
                  cursor: "zoom-in",
                  touchAction: "pan-y",
                }}
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

        {activeGallery.length > 1 ? (
          <>
            <button
              type="button"
              className="ss-product-gallery__nav-btn ss-product-gallery__nav-btn--prev"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              aria-label="Prethodna slika"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className="ss-product-gallery__nav-btn ss-product-gallery__nav-btn--next"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              aria-label="Sledeća slika"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <div className="ss-product-gallery__mobile-bar d-flex d-md-none">
              <div className="ss-product-gallery__mobile-dots">
                {activeGallery.map((_, idx) => (
                  <button
                    key={`dot-${idx}`}
                    type="button"
                    className={`ss-product-gallery__mobile-dot ${activeIndex === idx ? "is-active" : ""}`}
                    onClick={() => handleSelectIndex(idx)}
                    aria-label={`Slika ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="ss-product-gallery__mobile-counter">
                <span>{activeIndex + 1}</span>
                <span className="ss-product-gallery__mobile-counter-divider">/</span>
                <span>{activeGallery.length}</span>
              </div>
            </div>
          </>
        ) : null}
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
            ref={zoomFrameRef}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              position: "relative",
              overflow: "hidden",
              touchAction: "none",
              cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in",
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleZoomDoubleClick}
            onPointerDown={handleZoomPointerDown}
            onPointerMove={handleZoomPointerMove}
            onPointerUp={handleZoomPointerUp}
            onPointerCancel={handleZoomPointerUp}
          >
            {imageItems[lightboxIndex] ? (
              <img
                src={(imageItems[lightboxIndex] as { kind: "image"; src: string }).src}
                alt={`${name} ${lightboxIndex + 1}`}
                draggable={false}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  display: "block",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isPanning ? "none" : "transform 0.12s ease-out",
                  userSelect: "none",
                }}
              />
            ) : null}
          </div>
          {zoom === 1 ? (
            <div
              style={{
                position: "absolute", bottom: 16, right: 20,
                color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: "0.06em",
              }}
              aria-hidden
            >
              Skrol ili dupli klik za zum
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); resetZoom(); }}
              style={{
                position: "absolute", bottom: 16, right: 20,
                background: "rgba(255,255,255,0.12)", border: "none", color: "#fff",
                fontSize: 12, letterSpacing: "0.06em", padding: "8px 14px",
                borderRadius: 4, cursor: "pointer",
              }}
            >
              {Math.round(zoom * 100)}% — resetuj
            </button>
          )}
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
              onClick={() => handleSelectIndex(index)}
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
