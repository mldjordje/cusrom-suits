"use client";

import Image from "next/image";

export type AdminPickProduct = {
  legacyId: number;
  sku: string;
  name: string;
  coverImage?: string | null;
  images?: string[] | null;
};

const coverSrc = (item: AdminPickProduct) => item.coverImage || item.images?.[0] || "/img/odela2.jpg";

type Props = {
  candidates: AdminPickProduct[];
  onPick: (legacyId: number) => void;
  emptyHint?: string;
  maxItems?: number;
};

/**
 * Visual picker for landing section product lists - faster than long select dropdowns on mobile.
 */
export default function AdminLandingProductPickGrid({
  candidates,
  onPick,
  emptyHint,
  maxItems = 48,
}: Props) {
  if (!candidates.length) {
    return emptyHint ? <p className="text-xs text-slate-500">{emptyHint}</p> : null;
  }

  const slice = candidates.slice(0, maxItems);

  return (
    <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/90 p-2">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Klik na karticu dodaje proizvod
      </p>
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {slice.map((item) => (
          <button
            key={item.legacyId}
            type="button"
            onClick={() => onPick(item.legacyId)}
            className="group grid grid-cols-[88px_1fr] overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-blue-400 hover:shadow-md min-[420px]:flex min-[420px]:flex-col"
          >
            <div className="relative h-full min-h-24 w-full shrink-0 bg-slate-100 min-[420px]:h-24">
              <Image
                src={coverSrc(item)}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
                unoptimized
              />
            </div>
            <div className="min-w-0 p-2">
              <p className="font-mono text-[10px] text-slate-500">
                #{item.legacyId} / {item.sku}
              </p>
              <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-800">{item.name}</p>
            </div>
          </button>
        ))}
      </div>
      {candidates.length > maxItems ? (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          +{candidates.length - maxItems} vise - suzi pretragu ili koristi listu ispod
        </p>
      ) : null}
    </div>
  );
}
