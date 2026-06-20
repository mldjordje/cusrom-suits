"use client";

import { useMemo, useState } from "react";
import WashCareSymbol from "@/app/components/wash-care/WashCareSymbol";
import {
  WASH_CARE_GROUPS,
  WASH_CARE_SYMBOLS,
  type WashCareGroup,
  type WashCareSymbolKey,
} from "@/lib/catalog/washCare";

type Props = {
  value: WashCareSymbolKey[];
  onChange: (next: WashCareSymbolKey[]) => void;
};

const groupOrder = Object.keys(WASH_CARE_GROUPS) as WashCareGroup[];

export default function WashCareSelector({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const selectedSymbols = WASH_CARE_SYMBOLS.filter((symbol) => selected.has(symbol.key));
  const normalizedQuery = query.trim().toLocaleLowerCase("sr");
  const visibleSymbols = WASH_CARE_SYMBOLS.filter((symbol) =>
    !normalizedQuery || `${symbol.sr.name} ${symbol.sr.description}`.toLocaleLowerCase("sr").includes(normalizedQuery),
  );

  const toggle = (key: WashCareSymbolKey) => {
    const next = selected.has(key) ? value.filter((item) => item !== key) : [...value, key];
    const nextSet = new Set(next);
    onChange(WASH_CARE_SYMBOLS.map((symbol) => symbol.key).filter((item) => nextSet.has(item)));
  };

  return (
    <div className="flex flex-col gap-2 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Održavanje — simboli</span>
        {value.length > 0 ? (
          <button type="button" onClick={() => onChange([])} className="text-[10px] font-semibold uppercase tracking-[0.1em] text-rose-500 hover:text-rose-700">
            Obriši sve
          </button>
        ) : null}
      </div>

      {selectedSymbols.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedSymbols.map((symbol) => (
            <button key={symbol.key} type="button" onClick={() => toggle(symbol.key)} title={`Ukloni: ${symbol.sr.name}`} className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700">
              <WashCareSymbol icon={symbol.key} className="h-5 w-5" />
              <span>{symbol.sr.name}</span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      ) : <p className="text-[11px] text-slate-400">Nijedan simbol nije izabran. Sekcija održavanja neće biti prikazana na proizvodu.</p>}

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700">
          Izaberi wash-care simbole
          <span aria-hidden="true" className="transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="border-t border-slate-100 p-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pretraži simbole"
            className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-300"
          />
          <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
            {groupOrder.map((group) => {
              const symbols = visibleSymbols.filter((symbol) => symbol.group === group);
              if (!symbols.length) return null;
              return (
                <section key={group}>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{WASH_CARE_GROUPS[group].sr}</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {symbols.map((symbol) => (
                      <label key={symbol.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-xs ${selected.has(symbol.key) ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                        <input type="checkbox" checked={selected.has(symbol.key)} onChange={() => toggle(symbol.key)} className="sr-only" />
                        <WashCareSymbol icon={symbol.key} className="h-8 w-8 shrink-0" />
                        <span>{symbol.sr.name}</span>
                      </label>
                    ))}
                  </div>
                </section>
              );
            })}
            {visibleSymbols.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">Nema simbola za ovu pretragu.</p> : null}
          </div>
        </div>
      </details>
    </div>
  );
}
