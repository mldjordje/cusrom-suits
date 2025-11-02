"use client";
import React, { useEffect, useState } from "react";

type Fabric = {
  id: string;
  name: string;
  price: number;
  tone?: "light" | "medium" | "dark";
  description?: string;
  texture: string;
  zoom1?: string;
  zoom2?: string;
};

export default function FabricsAdminPage() {
  const [list, setList] = useState<Fabric[]>([]);
  const [form, setForm] = useState<Partial<Fabric>>({ tone: "medium", price: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fabrics", { cache: "no-store" });
      const json = await res.json();
      if (json.success) setList(json.data);
      else setError(json.error || "Greška pri čitanju tkanina");
    } catch (e: any) {
      setError(e?.message || "Greška pri pozivu API-ja");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/fabrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Neuspešno čuvanje");
      setForm({ tone: "medium", price: 0 });
      await load();
    } catch (e: any) {
      setError(e?.message || "Greška pri snimanju");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[#f7f7f7]">
      <h1 className="text-2xl font-semibold mb-6">CMS: Tkanine</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Dodaj tkaninu</h2>
          <div className="grid grid-cols-1 gap-3">
            <input className="border rounded p-2" placeholder="ID (npr. blue)" value={form.id || ""} onChange={(e)=>setForm(f=>({...f,id:e.target.value}))}/>
            <input className="border rounded p-2" placeholder="Naziv" value={form.name || ""} onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}/>
            <input className="border rounded p-2" placeholder="Cena (npr. 10)" type="number" value={form.price as any || 0} onChange={(e)=>setForm(f=>({...f,price:Number(e.target.value) }))}/>
            <select className="border rounded p-2" value={form.tone || "medium"} onChange={(e)=>setForm(f=>({...f,tone:e.target.value as any}))}>
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="dark">Dark</option>
            </select>
            <input className="border rounded p-2" placeholder="URL teksture" value={form.texture || ""} onChange={(e)=>setForm(f=>({...f,texture:e.target.value}))}/>
            <input className="border rounded p-2" placeholder="Zoom slika 1 (opciono)" value={form.zoom1 || ""} onChange={(e)=>setForm(f=>({...f,zoom1:e.target.value}))}/>
            <input className="border rounded p-2" placeholder="Zoom slika 2 (opciono)" value={form.zoom2 || ""} onChange={(e)=>setForm(f=>({...f,zoom2:e.target.value}))}/>
            <textarea className="border rounded p-2" placeholder="Opis" value={form.description || ""} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))}/>
          </div>
          <button className="mt-4 px-4 py-2 bg-black text-white rounded">Sačuvaj</button>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </form>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Postojeće tkanine</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Učitavanje…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((f) => (
                <div key={f.id} className="border rounded overflow-hidden">
                  <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${f.texture})` }} />
                  <div className="p-3">
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-xs text-gray-600">ID: {f.id} • Cena: {f.price}</div>
                    <div className="text-xs text-gray-600">Tone: {f.tone}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

