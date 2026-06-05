"use client";

import { useState } from "react";

type UniformGalleryProps = {
  images: string[];
  name: string;
};

/**
 * Gallery for business-uniform images. Uses plain <img> with the bundled local
 * paths (public/fajlovi/uniforme/...) directly, not next/image / StorefrontImage,
 * because sanitizeStorefrontImageSrc rewrites every "/fajlovi/*" path to
 * https://santos.rs/fajlovi/* which 404s for uniforms (they only exist locally),
 * making the storefront fall back to a generic placeholder. Here the real images
 * always render and there is no placeholder fallback.
 */
export default function UniformGallery({ images, name }: UniformGalleryProps) {
  const gallery = Array.from(
    new Set(images.map((img) => String(img || "").trim()).filter((img) => img.length > 0)),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = gallery[Math.min(activeIndex, Math.max(gallery.length - 1, 0))] || gallery[0];

  if (!activeSrc) return null;

  return (
    <div className="ss-uniform-gallery">
      <div className="ss-uniform-gallery__main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={activeSrc} alt={name} loading="eager" decoding="async" />
      </div>

      {gallery.length > 1 ? (
        <div className="ss-uniform-gallery__thumbs" role="listbox" aria-label="Uniform images">
          {gallery.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={`ss-uniform-gallery__thumb ${activeIndex === index ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-pressed={activeIndex === index}
              aria-label={`${name} ${index + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
