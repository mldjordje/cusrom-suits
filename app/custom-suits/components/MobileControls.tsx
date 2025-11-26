"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useMemo, useState } from "react";
import { SuitState } from "../hooks/useSuitConfigurator";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { useFabrics } from "../hooks/useFabrics";
import { computePrice } from "../utils/price";

type Panel = "FABRIC" | "STYLE" | "ACCENTS";

type Props = {
  config: SuitState;
  dispatch: React.Dispatch<any>;
};

const NAV = [
  { id: "FABRIC" as const, label: "Tkanine", icon: "/custom-suits/icons/iconfabric.png" },
  { id: "STYLE" as const, label: "Stil", icon: "/custom-suits/icons/iconstyle.png" },
  { id: "ACCENTS" as const, label: "Detalji", icon: "/custom-suits/icons/iconaccents.png" },
];

const toneLabels: Record<"all" | "light" | "medium" | "dark", string> = {
  all: "Svi tonovi",
  light: "Svetli",
  medium: "Srednji",
  dark: "Tamni",
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
      <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Prilagodi</p>
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
        <p className="text-sm font-semibold text-gray-900">{fabric.name || "Tkanina"}</p>
        {active && <Badge label="Izabrano" />}
      </div>
      <p className="text-[11px] text-gray-500">
        {fabric.price ?? 0} EUR - ton {fabric.tone || "medium"}
      </p>
      {fabric.code && <p className="text-[11px] text-gray-400">ifra: {fabric.code}</p>}
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
      className={`fixed inset-0 z-[60] flex transition lg:hidden ${
        active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div
        className={`pointer-events-auto flex h-full w-[68vw] max-w-[360px] flex-col overflow-hidden sm:max-w-[420px] transform bg-white shadow-2xl transition duration-200 ease-out ${
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
  const [savingCart, setSavingCart] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
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
  const measurementUrl = useMemo(() => {
    const json = JSON.stringify(config);
    const url = new URL(typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.pathname = "/custom-suits/measure";
    url.searchParams.set("config", json);
    return url.toString();
  }, [config]);

  const handleAddToCart = async () => {
    if (savingCart) return;
    setFeedback(null);
    try {
      setSavingCart(true);
      const existingRaw = localStorage.getItem("suitCart");
      const parsed = existingRaw ? JSON.parse(existingRaw) : [];
      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        config,
        price,
        addedAt: new Date().toISOString(),
      };
      parsed.unshift(entry);
      localStorage.setItem("suitCart", JSON.stringify(parsed));

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            price: price.total,
            fabricId: config.colorId,
            contact: null,
          }),
        });
        const json = await res.json();
        if (!json?.success) {
          console.error("Order sync failed", json?.message);
        }
      } catch (err) {
        console.error("Order sync failed", err);
      }

      setFeedback("Dizajn je sacuvan. Nastavite na mere i naplatu.");
    } catch (err) {
      console.error("Add to cart failed", err);
      alert("Nije moguce dodati u korpu trenutno. Pokusajte ponovo.");
    } finally {
      setSavingCart(false);
    }
  };

  const renderFabricPanel = () => (
    <>
      <DrawerHeader title="Biblioteka tkanina" onClose={() => setActivePanel(null)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex gap-2">
            <input
              value={fabricQuery}
              onChange={(e) => setFabricQuery(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              placeholder="Pretrazi tkaninu ili ifru"
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
              <option value="date_desc">Najnovije</option>
              <option value="date_asc">Najstarije</option>
            </select>
          </div>
          {fabricsError && <p className="text-[11px] text-orange-600">{fabricsError}</p>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-28">
          {fabricsLoading ? (
            <p className="text-sm text-gray-500">Ucitavanje tkanina...</p>
          ) : filteredFabrics.length === 0 ? (
            <p className="text-sm text-gray-500">Nema tkanina za zadate filtere.</p>
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
            Primeni tkaninu
          </button>
        </div>
      </div>
    </>
  );

  const renderStylePanel = () => (
    <>
      <DrawerHeader title="Stil" onClose={() => setActivePanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-14">
        <ChoiceGroup
          title="Model odela"
          options={suits.map((suit) => ({ id: suit.id, label: suit.name }))}
          selectedId={config.styleId}
          onSelect={(id) => dispatch({ type: "SET_STYLE", payload: id })}
        />
        <ChoiceGroup
          title="Tip revera"
          options={lapels.map((lapel) => ({ id: lapel.id, label: lapel.name }))}
          selectedId={selectedLapelId}
          onSelect={(id) => dispatch({ type: "SET_LAPEL", payload: id })}
        />
        {activeLapel?.widths?.length ? (
          <ChoiceGroup
            title="Širina revera"
            options={activeLapel.widths.map((width) => ({ id: width.id, label: width.name }))}
            selectedId={selectedLapelWidthId}
            onSelect={(id) => dispatch({ type: "SET_LAPEL_WIDTH", payload: id })}
            columns={3}
          />
        ) : null}
      </div>
    </>
  );

  const renderAccentsPanel = () => (
    <>
      <DrawerHeader title="Detalji" onClose={() => setActivePanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-14">
        {currentSuit?.pockets?.length ? (
          <ChoiceGroup
            title="Depovi na sakou"
            options={(currentSuit.pockets || []).map((pocket) => ({ id: pocket.id, label: pocket.name }))}
            selectedId={config.pocketId}
            onSelect={(id) => dispatch({ type: "SET_POCKET", payload: id })}
          />
        ) : null}
        {currentSuit?.breastPocket?.length ? (
          <ChoiceGroup
            title="Dep na grudima"
            options={(currentSuit.breastPocket || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.breastPocketId}
            onSelect={(id) => dispatch({ type: "SET_BREAST_POCKET", payload: id })}
          />
        ) : null}
        {currentSuit?.interiors?.length ? (
          <ChoiceGroup
            title="Postava"
            options={(currentSuit.interiors || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.interiorId}
            onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
          />
        ) : null}
        {currentSuit?.cuffs?.length ? (
          <ChoiceGroup
            title="Zavrnica pantalona"
            options={(currentSuit.cuffs || []).map((option) => ({ id: option.id, label: option.name }))}
            selectedId={config.cuffId}
            onSelect={(id) => dispatch({ type: "SET_CUFF", payload: id })}
          />
        ) : null}

        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">Prikai sloj koulje</p>
            <p className="text-[11px] text-gray-500">Pomae pri vizualizaciji revera i linija depova.</p>
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              config.showShirt ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {config.showShirt ? "Ukljueno" : "Iskljueno"}
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600">
          Personalni monogram i dugmad stižu uskoro. Javite nam šta vam treba i stavićemo ga u prioritet.
        </div>
      </div>
    </>
  );

  const drawerBody = (() => {
    if (activePanel === "FABRIC") return renderFabricPanel();
    if (activePanel === "STYLE") return renderStylePanel();
    if (activePanel === "ACCENTS") return renderAccentsPanel();
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
                    onClick={() => setActivePanel(item.id)}
                    className={`flex flex-col items-center gap-1 rounded-2xl px-4 py-3 transition ${
                      active ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50">
                      <img src={item.icon} alt={item.label} className="h-7 w-7 object-contain opacity-80" />
                    </span>
                    <span className="text-[11px] font-semibold tracking-[0.2em] uppercase">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3 border-t border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tvoje custom odelo</p>
                  <p className="text-[11px] text-gray-500">
                    {price.total} EUR - Isporuka za ~3 nedelje
                  </p>
                  <p className="text-[11px] text-gray-500">1) Dizajn 2) Mere 3) Korpa i placanje</p>
                </div>
                <button
                  onClick={handleAddToCart}
                  disabled={savingCart}
                  className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e86d00] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingCart ? "Upisujem..." : "Sacuvaj dizajn"}
                </button>
              </div>
              <button
                onClick={() => {
                  window.location.href = measurementUrl;
                }}
                className="w-full rounded-full border border-gray-900 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
              >
                Nastavi na mere i korpu
              </button>
              {feedback && <p className="text-[11px] font-semibold text-emerald-600">{feedback}</p>}
            </div>
          </div>
        </div>
      </div>

      {activePanel && (
        <Drawer panel={activePanel} onClose={() => setActivePanel(null)}>
          {drawerBody}
        </Drawer>
      )}
    </>
  );
}

export default MobileControls;
