"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type MenuItem = {
  id: string;
  number: string;
  name: string;
  nameEn: string;
  tag: string;
  href: string;
  image: string;
};

type Props = {
  items: MenuItem[];
  lang?: string;
};

export default function FlowingMenu({ items, lang = "sr" }: Props) {
  const isEn = lang === "en";
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="position-relative py-5 overflow-hidden"
      style={{ backgroundColor: "#0e0d0b", borderBottom: "1px solid rgba(242,238,231,0.08)" }}
    >
      {/* Floating Follower Image (Desktop) */}
      {activeItem && (
        <div
          className="position-absolute d-none d-lg-block rounded-2 overflow-hidden shadow-2xl pointer-events-none"
          style={{
            width: "300px",
            height: "400px",
            left: `${mousePos.x + 40}px`,
            top: `${mousePos.y - 200}px`,
            transform: "translate3d(0, 0, 0)",
            transition: "left 0.15s ease-out, top 0.15s ease-out",
            zIndex: 10,
            border: "1px solid rgba(201,169,110,0.4)",
          }}
        >
          <Image
            src={activeItem.image}
            alt={activeItem.name}
            fill
            className="object-fit-cover"
            sizes="300px"
          />
          <div
            className="position-absolute bottom-0 start-0 end-0 p-3 text-center"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(8,7,6,0.9) 100%)",
            }}
          >
            <span className="ss-lp-eyebrow" style={{ fontSize: "0.65rem" }}>
              {activeItem.tag}
            </span>
          </div>
        </div>
      )}

      {/* Menu Rows */}
      <div className="container position-relative" style={{ zIndex: 2 }}>
        <div className="d-flex flex-column divide-y divide-dark">
          {items.map((item) => (
            <Link
              key={item.id}
              href={isEn ? `${item.href}&lang=en` : item.href}
              onMouseEnter={() => setActiveItem(item)}
              onMouseLeave={() => setActiveItem(null)}
              className="d-flex align-items-center justify-content-between py-4 text-decoration-none border-bottom border-dark position-relative group"
              style={{ transition: "padding 0.3s ease, border-color 0.3s ease" }}
            >
              <div className="d-flex align-items-center gap-4">
                <span className="text-white-50 small fw-mono">{item.number}</span>
                <span
                  className="ss-lp-title fs-2 text-white m-0"
                  style={{ transition: "color 0.3s ease" }}
                >
                  {isEn ? item.nameEn : item.name}
                </span>
              </div>

              <div className="d-flex align-items-center gap-3">
                <span className="ss-lp-eyebrow d-none d-md-inline-block">
                  {item.tag}
                </span>
                <span className="text-warning fs-3">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
