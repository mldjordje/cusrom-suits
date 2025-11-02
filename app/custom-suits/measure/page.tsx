"use client";
import React, { useMemo, useState } from "react";

type Reco = {
  size: string;
  chest: number;
  waist: number;
  sleeve: number;
  inseam: number;
};

export default function MeasurePage() {
  const [h, setH] = useState<number | "">(180);
  const [w, setW] = useState<number | "">(80);
  const [age, setAge] = useState<number | "">(30);

  const reco: Reco | null = useMemo(() => {
    if (!h || !w) return null;
    const height = Number(h);
    const weight = Number(w);
    const bmi = weight / Math.pow(height / 100, 2);
    let size = "M";
    if (bmi < 21) size = "S";
    else if (bmi > 27) size = "L";
    if (bmi > 31) size = "XL";
    const chest = Math.round(0.52 * height + (bmi - 23) * 1.2);
    const waist = Math.round(0.45 * height + (bmi - 23) * 1.5);
    const sleeve = Math.round(0.40 * height + 2);
    const inseam = Math.round(0.47 * height);
    return { size, chest, waist, sleeve, inseam };
  }, [h, w]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6 md:p-10">
      <h1 className="text-2xl font-semibold mb-6">Measurements</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <form className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm">Visina (cm)
              <input className="mt-1 border rounded p-2 w-full" type="number" value={h as any} onChange={(e)=>setH(e.target.value?Number(e.target.value):"")} />
            </label>
            <label className="text-sm">Težina (kg)
              <input className="mt-1 border rounded p-2 w-full" type="number" value={w as any} onChange={(e)=>setW(e.target.value?Number(e.target.value):"")} />
            </label>
            <label className="text-sm">Godine
              <input className="mt-1 border rounded p-2 w-full" type="number" value={age as any} onChange={(e)=>setAge(e.target.value?Number(e.target.value):"")} />
            </label>
          </div>
          <p className="text-xs text-[#666] mt-3">Preporuka se automatski računa i kasnije je možete izmeniti.</p>
        </form>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-3">Preporučene mere</h2>
          {!reco ? (
            <p className="text-sm text-[#777]">Unesite visinu i težinu.</p>
          ) : (
            <ul className="text-sm space-y-2">
              <li>Veličina: <b>{reco.size}</b></li>
              <li>Grudi: <b>{reco.chest}</b> cm</li>
              <li>Struk: <b>{reco.waist}</b> cm</li>
              <li>Rukav: <b>{reco.sleeve}</b> cm</li>
              <li>Dužina nogavice (inseam): <b>{reco.inseam}</b> cm</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

