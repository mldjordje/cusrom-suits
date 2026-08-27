"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export type GalleryItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
};

type Props = {
  items: GalleryItem[];
  radius?: number;
};

export default function RollingGallery({ items, radius = 450 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cylinderRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentRotation = useRef(0);

  const angleStep = 360 / items.length;

  useGSAP(
    () => {
      if (!containerRef.current || !cylinderRef.current) return;

      // Scroll-driven slow cylinder rotation
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.5,
        onUpdate: (self) => {
          if (!isDragging.current) {
            const rot = self.progress * 180;
            currentRotation.current = rot;
            setRotation(rot);
          }
        },
      });
    },
    { scope: containerRef },
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    startX.current = e.clientX;
    const newRot = currentRotation.current + delta * 0.4;
    currentRotation.current = newRot;
    setRotation(newRot);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="position-relative w-100 overflow-hidden user-select-none"
      style={{
        height: "580px",
        perspective: "1200px",
        cursor: "grab",
        touchAction: "pan-y",
      }}
    >
      <div
        ref={cylinderRef}
        className="position-absolute top-50 start-50"
        style={{
          width: "280px",
          height: "380px",
          transformStyle: "preserve-3d",
          transform: `translate(-50%, -50%) rotateY(${rotation}deg)`,
          transition: isDragging.current ? "none" : "transform 0.1s ease-out",
          willChange: "transform",
        }}
      >
        {items.map((item, index) => {
          const itemAngle = index * angleStep;
          return (
            <div
              key={item.id}
              className="position-absolute top-0 start-0 w-100 h-100 rounded-2 overflow-hidden border border-secondary border-opacity-25 shadow-lg"
              style={{
                transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                backgroundColor: "#121110",
              }}
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-fit-cover pointer-events-none"
                sizes="300px"
              />
              <div
                className="position-absolute bottom-0 start-0 end-0 p-3"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, rgba(8,7,6,0.85) 60%, #080706 100%)",
                }}
              >
                <div className="ss-lp-eyebrow mb-1" style={{ fontSize: "0.65rem" }}>
                  {item.subtitle}
                </div>
                <h4 className="text-white fs-6 m-0 fw-semibold mb-2">
                  {item.title}
                </h4>
                <Link
                  href={item.href}
                  className="badge bg-warning text-dark text-decoration-none px-2 py-1"
                  style={{ fontSize: "0.7rem" }}
                >
                  Istraži Model →
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
