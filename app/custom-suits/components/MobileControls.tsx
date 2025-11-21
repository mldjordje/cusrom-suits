"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState } from "react";
import { SuitState } from "../hooks/useSuitConfigurator";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { useFabrics } from "../hooks/useFabrics";
import { computePrice } from "../utils/price";

type Panel = "FABRIC" | "STYLE" | "ACCENTS" | "MEASURE";

type Props = {
  config: SuitState;
  dispatch: React.Dispatch<any>;
};

const NAV = [
  { id: "FABRIC" as const, label: "Fabric", icon: "/custom-suits/icons/iconfabric.png" },
  { id: "STYLE" as const, label: "Style", icon: "/custom-suits/icons/iconstyle.png" },
  { id: "ACCENTS" as const, label: "Accents", icon: "/custom-suits/icons/iconaccents.png" },
  { id: "MEASURE" as const, label: "Measure", icon: "/custom-suits/icons/iconstyle.png" },
];

const toneLabels: Record<"all" | "light" | "medium" | "dark", string> = {
  all: "All tones",
  light: "Light",
  medium: "Medium",
  dark: "Dark",
};

const Badge = ({ label }: { label: string }) => (
  <span className="rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
    {label}
  </span>
);

const ChoiceGroup = ({
  title,
  options,
  selectedId,
  onSelect,
  columns = 2,
}: {
  title: string;
  options: { id: string; label: string; hint?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  columns?: 2 | 3;
}) => {
  if (!options.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">{title}</p>
      <div className={`grid gap-2 ${columns === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((option) => {
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <p className="text-sm font-semibold leading-tight">{option.label}</p>
              {option.hint && <p className={`text-[11px] ${active ? "text-white/80" : "text-gray-500"}`}>{option.hint}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DrawerHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) => (
  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
    <div>
      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Customize</p>
      <p className="text-lg font-semibold text-gray-900">{title}</p>
    </div>
    <button
      onClick={onClose}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200"
      aria-label="Close panel"
    >
      &times;
    </button>
  </div>
);

const FabricCard = ({
  fabric,
  active,
  onSelect,
}: {
  fabric: any;
  active: boolean;
  onSelect: () => void;
}) => (
  <button
    onClick={onSelect}
    className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left transition ${
      active ? "border-gray-900 shadow-md" : "border-gray-200 hover:border-gray-400"
    }`}
  >
    <div className="relative h-20 w-24 overflow-hidden rounded-xl bg-gray-100">
      <img src={fabric.texture} alt={fabric.name} className="h-full w-full object-cover" />
      {active && <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-gray-900">{fabric.name || "Fabric"}</p>
        {active && <Badge label="Selected" />}
      </div>
      <p className="text-[11px] text-gray-500">
        {fabric.price ?? 0} EUR - {fabric.tone || "medium"} tone
      </p>
      {fabric.code && <p className="text-[11px] text-gray-400">Code: {fabric.code}</p>}
    </div>
  </button>
);

const Drawer = ({
  panel,
  children,
  onClose,
}: {
  panel: Panel | null;
  children: React.ReactNode;
  onClose: () => void;
}) => {
  const active = Boolean(panel);
  return (
    <div
      className={`fixed inset-0 z-40 flex transition lg:hidden ${
        active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!active}
    >
      <div
        className={`pointer-events-auto h-full w-[78vw] max-w-[420px] transform bg-white shadow-2xl transition duration-200 ease-out ${
          active ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </div>
      <button
        aria-label="Close"
        onClick={onClose}
        className={`pointer-events-auto h-full flex-1 bg-black/25 transition ${active ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
};

function MobileControls({ config, dispatch }: Props) {
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [toneFilter, setToneFilter] = useState<"all" | "light" | "medium" | "dark">("all");
  const [fabricQuery, setFabricQuery] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");

  const { fabrics, loading: fabricsLoading, error: fabricsError } = useFabrics({
    tone: toneFilter === "all" ? undefined : toneFilter,
    sort: "created_at",
    order: sort === "date_desc" ? "desc" : "asc",
  });

  const fabricsNormalized = useMemo(
    () =>
      fabrics.length
        ? fabrics.map((x: any) => ({ ...x, id: String(x.id) }))
        : fallbackFabrics.map((fabric) => ({
            ...fabric,
            id: String(fabric.id),
            price: (fabric as any).price ?? 0,
            tone: (fabric as any).tone ?? "medium",
          })),
    [fabrics]
  );

  const filteredFabrics = useMemo(() => {
    const query = fabricQuery.trim().toLowerCase();
    if (!query) return fabricsNormalized;
    return fabricsNormalized.filter((fabric: any) => {
      const name = String(fabric.name || "").toLowerCase();
      const code = String(fabric.code || "").toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [fabricQuery, fabricsNormalized]);

  const price = computePrice(config, suits);
  const currentSuit = suits.find((s) => s.id === config.styleId);
  const lapels = currentSuit?.lapels ?? [];
  const selectedLapelId = config.lapelId || lapels[0]?.id;
  const activeLapel = lapels.find((lapel) => lapel.id === selectedLapelId) || lapels[0];
  const selectedLapelWidthId = config.lapelWidthId || activeLapel?.widths?.[0]?.id;

  const renderFabricPanel = () => (
    <>
      <DrawerHeader title="Fabric Library" onClose={() => setActivePanel(null)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex gap-2">
            <input
              value={fabricQuery}
              onChange={(e) => setFabricQuery(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              placeholder="Search fabric or code"
            />
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              value={toneFilter}
              onChange={(e) => setToneFilter(e.target.value as any)}
            >
              {Object.keys(toneLabels).map((tone) => (
                <option key={tone} value={tone}>
                  {toneLabels[tone as keyof typeof toneLabels]}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
            </select>
          </div>
          {fabricsError && <p className="text-[11px] text-orange-600">{fabricsError}</p>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-28">
          {fabricsLoading ? (
            <p className="text-sm text-gray-500">Loading fabrics...</p>
          ) : filteredFabrics.length === 0 ? (
            <p className="text-sm text-gray-500">No fabrics found for current filters.</p>
          ) : (
            filteredFabrics.map((fabric: any) => (
              <FabricCard
                key={fabric.id}
                fabric={fabric}
                active={config.colorId === fabric.id}
                onSelect={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
              />
            ))
          )}
        </div>
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3">
          <button
            onClick={() => setActivePanel(null)}
            className="w-full rounded-full bg-gray-900 px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-gray-800"
          >
            Apply fabric
          </button>
        </div>
      </div>
    </>
  );

  const renderStylePanel = () => (
    <>
      <DrawerHeader title="Style" onClose={() => setActivePanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-14">
        <ChoiceGroup
          title="Suit model"
          options={suits.map((suit) => ({ id: suit.id, label: suit.name }))}
          selectedId={config.styleId}
          onSelect={(id) => dispatch({ type: "SET_STYLE", payload: id })}
        />
        <ChoiceGroup
          title="Lapel type"
          options={lapels.map((lapel) => ({ id: lapel.id, label: lapel.name }))}
          selectedId={selectedLapelId}
          onSelect={(id) => dispatch({ type: "SET_LAPEL", payload: id })}
        />
        {activeLapel?.widths?.length ? (
          <ChoiceGroup
            title="Lapel width"
            options={activeLapel.widths.map((width) => ({ id: width.id, label: width.name }))}
            selectedId={selectedLapelWidthId}
            onSelect={(id) => dispatch({ type: "SET_LAPEL_WIDTH", payload: id })}
            columns={3}
          />
        ) : null}
        {currentSuit?.cuffs?.length ? (
          <ChoiceGroup
            title="Pant hem"
            options={(currentSuit.cuffs || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.cuffId}
            onSelect={(id) => dispatch({ type: "SET_CUFF", payload: id })}
          />
        ) : null}
      </div>
    </>
  );

  const renderAccentsPanel = () => (
    <>
      <DrawerHeader title="Accents" onClose={() => setActivePanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-14">
        {currentSuit?.pockets?.length ? (
          <ChoiceGroup
            title="Jacket pockets"
            options={(currentSuit.pockets || []).map((pocket) => ({ id: pocket.id, label: pocket.name }))}
            selectedId={config.pocketId}
            onSelect={(id) => dispatch({ type: "SET_POCKET", payload: id })}
          />
        ) : null}
        {currentSuit?.breastPocket?.length ? (
          <ChoiceGroup
            title="Breast pocket"
            options={(currentSuit.breastPocket || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.breastPocketId}
            onSelect={(id) => dispatch({ type: "SET_BREAST_POCKET", payload: id })}
          />
        ) : null}
        {currentSuit?.interiors?.length ? (
          <ChoiceGroup
            title="Internal lining"
            options={(currentSuit.interiors || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.interiorId}
            onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
          />
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Show shirt layer</p>
            <p className="text-[11px] text-gray-500">Helpful for visualizing lapel and pocket lines.</p>
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              config.showShirt ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {config.showShirt ? "On" : "Off"}
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600">
          Personal monogram and button accents are coming soon. Tell us what you need and we&apos;ll prioritize it.
        </div>
      </div>
    </>
  );

  const renderMeasurePanel = () => (
    <>
      <DrawerHeader title="Measure" onClose={() => setActivePanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-14">
        <h3 className="text-lg font-semibold text-gray-900">Mere i prilagodjavanje</h3>
        <p className="text-sm text-gray-600">
          Za detaljno uklapanje nastavite ka merenju. Mozete uneti mere ili zakazati termin sa savetnikom.
        </p>
        <button
          onClick={() => {
            const url = new URL(window.location.origin + "/custom-suits/measure");
            window.location.href = url.toString();
          }}
          className="w-full rounded-full bg-gray-900 px-5 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-gray-800"
        >
          Nastavi na merenje
        </button>
      </div>
    </>
  );

  const drawerBody = (() => {
    if (activePanel === "FABRIC") return renderFabricPanel();
    if (activePanel === "STYLE") return renderStylePanel();
    if (activePanel === "ACCENTS") return renderAccentsPanel();
    if (activePanel === "MEASURE") return renderMeasurePanel();
    return null;
  })();

  return (
    <>
      <div className="lg:hidden">
        <div className="mt-6 h-[1px] w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="fixed bottom-3 left-0 right-0 z-30 px-3">
          <div className="mx-auto max-w-lg rounded-[26px] bg-white shadow-[0_25px_80px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              {NAV.map((item) => {
                const active = activePanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePanel(active ? null : item.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition ${
                      active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
                      <img src={item.icon} alt={item.label} className="h-5 w-5 object-contain opacity-80" />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Your Custom Suit</p>
                  <p className="text-[11px] text-gray-500">
                    {price.total} EUR - Delivery in ~3 weeks
                  </p>
                </div>
                <button className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e86d00]">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer panel={activePanel} onClose={() => setActivePanel(null)}>
        {drawerBody}
      </Drawer>
    </>
  );
}

export default MobileControls;
