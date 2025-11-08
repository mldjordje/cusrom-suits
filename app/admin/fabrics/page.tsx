"use client";
import React, { useCallback, useEffect, useState } from "react";
import { getBackendBase } from "../../custom-suits/utils/backend";

type PhpFabric = {
  id: number | string;
  name: string;
  texture: string;
  tone?: "light" | "medium" | "dark";
  created_at?: string;
};

export default function FabricsAdminPage() {
  const BACKEND_BASE = getBackendBase();
  const [list, setList] = useState<PhpFabric[]>([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastTone, setLastTone] = useState<string | null>(null);

  const usingPhpApi = Boolean(BACKEND_BASE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (usingPhpApi) {
        const res = await fetch(`${BACKEND_BASE}fabrics.php`, { cache: "no-store" });
        const json = await res.json();
        if (json.success) setList(json.data);
        else setError(json.error || "Greška pri čitanju tkanina");
      } else {
        // Fallback na lokalni Next API (dev okruženje)
        const res = await fetch("/api/fabrics", { cache: "no-store" });
        const json = await res.json();
        if (json.success) setList(json.data);
        else setError(json.error || "Greška pri čitanju tkanina");
      }
    } catch (e: any) {
      setError(e?.message || "Greška pri pozivu API-ja");
    } finally {
      setLoading(false);
    }
  }, [BACKEND_BASE, usingPhpApi]);

  useEffect(() => { load(); }, [load]);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setLastTone(null);
    try {
      if (usingPhpApi) {
        if (!file) throw new Error("Izaberite fajl tkanine");
        const fd = new FormData();
        fd.append("name", name || "Bez naziva");
        fd.append("texture", file);
        const res = await fetch(`${BACKEND_BASE}upload_fabric.php`, { method: "POST", body: fd });
        const json = await res.json();
        if (!json.success) throw new Error(json.message || json.error || "Neuspešno čuvanje");
        setName("");
        setFile(null);
        setLastTone(json.tone || null);
        await load();
      } else {
        throw new Error("NEXT_PUBLIC_BACKEND_BASE nije podešen — uključite PHP API");
      }
    } catch (e: any) {
      setError(e?.message || "Greška pri snimanju");
    }
  };

  const onDelete = async (id: number | string) => {
    if (!usingPhpApi) return;
    if (!confirm(`Obrisati tkaninu #${id}?`)) return;
    try {
      const res = await fetch(`${BACKEND_BASE}delete_fabric.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.error || "Greška pri brisanju");
      await load();
    } catch (e: any) {
      alert(e?.message || "Greška pri brisanju");
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 bg-[#f7f7f7]">
      <h1 className="text-2xl font-semibold mb-6">CMS: Tkanine</h1>
      <div className="grid md:grid-cols-2 gap-8">
        <form onSubmit={submit} className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Dodaj tkaninu (upload)</h2>
          <div className="grid grid-cols-1 gap-3">
            <input className="border rounded p-2" placeholder="Naziv" value={name} onChange={(e)=>setName(e.target.value)} />
            <input className="border rounded p-2" type="file" accept="image/*" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          </div>
          <button className="mt-4 px-4 py-2 bg-black text-white rounded">Sačuvaj</button>
          {lastTone && <p className="text-xs text-green-700 mt-2">Detected tone: {lastTone}</p>}
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          {!usingPhpApi && (
            <p className="text-xs text-amber-700 mt-2">Napomena: Postavite NEXT_PUBLIC_BACKEND_BASE da biste koristili PHP API.</p>
          )}
        </form>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Postojeće tkanine</h2>
          {loading ? (
            <p className="text-gray-500 text-sm">Učitavanje…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((f) => (
                <div key={String(f.id)} className="border rounded overflow-hidden">
                  <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${f.texture})` }} />
                  <div className="p-3">
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-xs text-gray-600">ID: {String(f.id)}</div>
                    <div className="text-xs text-gray-600">Tone: {f.tone || "-"}</div>
                    {usingPhpApi && (
                      <button onClick={()=>onDelete(f.id)} className="mt-2 px-3 py-1 border rounded">Obriši</button>
                    )}
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
