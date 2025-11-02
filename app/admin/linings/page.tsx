"use client";
import React, { useEffect, useState } from "react";

type Lining = { id: string; name: string; price: number };

export default function LiningsAdminPage() {
  const [list, setList] = useState<Lining[]>([]);
  const [form, setForm] = useState<Partial<Lining>>({ price: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/linings", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setList(json.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try {
      const res = await fetch("/api/linings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json(); if (!j.success) throw new Error(j.error || "Greška");
      setForm({ price: 0 }); load();
    } catch (e: any) { setError(e?.message || "Greška"); }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[#f7f7f7]">
      <h1 className="text-2xl font-semibold mb-6">CMS: Postava</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Dodaj postavu</h2>
          <input className="border rounded p-2 mb-2 w-full" placeholder="ID (npr. contrast)" value={form.id || ""} onChange={(e)=>setForm(f=>({...f,id:e.target.value}))} />
          <input className="border rounded p-2 mb-2 w-full" placeholder="Naziv" value={form.name || ""} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))} />
          <input className="border rounded p-2 mb-2 w-full" placeholder="Cena" type="number" value={(form.price as any) || 0} onChange={(e)=>setForm(f=>({...f,price:Number(e.target.value)}))} />
          <button className="mt-2 px-4 py-2 bg-black text-white rounded">Sačuvaj</button>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </form>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Postojeće</h2>
          <ul className="text-sm divide-y">
            {list.map((l)=> (
              <li key={l.id} className="py-2 flex items-center justify-between"><span>{l.name} <span className="text-[#777]">({l.id})</span></span><span className="font-semibold">{l.price}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

