"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

type ProductImageGalleryProps = {
  images: string[];
  name: string;
};

export default function ProductImageGallery({ images, name }: ProductImageGalleryProps) {
  const gallery = useMemo(() => {
    const clean = images.map((img) => String(img || "").trim()).filter((img) => img.length > 0);
    return Array.from(new Set(clean));
  }, [images]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = gallery[activeIndex] || gallery[0];
  if (!activeImage) return null;

  return (
    <div className="ss-product-gallery">
      <div className="ss-product-gallery__main">
        <Image
          src={activeImage}
          width={900}
          height={1000}
          alt={name}
          className="ss-product-gallery__main-image"
          priority
          quality={78}
          sizes="(max-width: 575px) 100vw, (max-width: 991px) 92vw, 58vw"
        />
      </div>

      {gallery.length > 1 ? (
        <div className="ss-product-gallery__thumbs" role="listbox" aria-label="Product image thumbnails">
          {gallery.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`ss-product-gallery__thumb ${activeIndex === index ? "is-active" : ""}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1}`}
              aria-pressed={activeIndex === index}
            >
              <Image
                src={image}
                width={96}
                height={112}
                alt={`${name} thumbnail ${index + 1}`}
                className="ss-product-gallery__thumb-image"
                quality={64}
                sizes="96px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
