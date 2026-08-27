"use client";

import RollingGallery, { type GalleryItem } from "@/app/components/motion/RollingGallery";

type Props = {
  items: GalleryItem[];
  lang?: string;
};

export default function Landing3DLookbook({ items, lang = "sr" }: Props) {
  const isEn = lang === "en";

  return (
    <section className="position-relative py-5 overflow-hidden bg-black text-white border-top border-bottom border-dark">
      <div className="container text-center mb-4">
        <span className="ss-lp-eyebrow mb-2">
          {isEn ? "3D INTERACTIVE RUNWAY • COLLECTION 2026" : "3D INTERAKTIVNA PISTA • MODNI LOOKBOOK"}
        </span>
        <h2 className="ss-lp-title ss-lp-title--dark fs-1 m-0 text-white">
          {isEn ? "The 3D Cylindrical Runway" : "Kolekcija u 3D Pokretu"}
        </h2>
        <p className="text-white-50 small mt-2 mb-0" style={{ maxWidth: "560px", margin: "0 auto" }}>
          {isEn
            ? "Swipe, drag, or scroll to rotate through our signature Italian suits, jackets, and accessories in a 3D cylindrical space."
            : "Prevucite prstom, mišem ili skrolujte za 3D rotaciju kroz odabrane modele odela, sakoa i aksesoara."}
        </p>
      </div>

      {/* 3D Circular Cylinder Runway */}
      <RollingGallery items={items} radius={460} />
    </section>
  );
}
