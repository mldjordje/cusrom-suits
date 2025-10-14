"use client";
import React from "react";
import Sidebar from "../../components/Sidebar";
import Preview from "../../components/Preview";

export default function Page() {
  const [model, setModel] = React.useState<"single_2btn" | "double_6btn" | "tuxedo">("single_2btn");
  const [color, setColor] = React.useState<"blue">("blue");

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto grid md:grid-cols-[20rem,1fr]">
        <Sidebar model={model} color={color} onModelChange={(m)=>setModel(m as any)} onColorChange={(c)=>setColor(c as any)} />
        <section className="p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl md:text-2xl font-bold">Custom Suit Configurator</h1>
            <button className="px-4 py-2 rounded-xl border border-black hover:bg-black hover:text-white transition">Sačuvaj</button>
          </div>
          <Preview model={model} color={color} />
        </section>
      </div>
    </main>
  );
}
