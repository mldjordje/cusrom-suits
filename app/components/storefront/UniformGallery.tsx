"use client";

import { useState } from "react";
import StorefrontImage from "@/app/components/storefront/StorefrontImage";

type UniformGalleryProps = {
  images: string[];
  name: string;
};

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
        <StorefrontImage
          sources={[activeSrc]}
          fallbackSrc="/img/hero2.jpg"
          alt={name}
          width={960}
          height={1160}
          priority
          className="h-auto w-100"
          sizes="(max-width: 991px) 100vw, 58vw"
        />
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
              <StorefrontImage
                sources={[src]}
                fallbackSrc="/img/hero2.jpg"
                alt=""
                width={160}
                height={190}
                className="h-100 w-100"
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
