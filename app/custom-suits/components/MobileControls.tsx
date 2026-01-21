"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion, type Variants } from "framer-motion";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { SuitState } from "../hooks/useSuitConfigurator";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { useFabrics } from "../hooks/useFabrics";
import { useButtons } from "../hooks/useButtons";
import { useLinings } from "../hooks/useLinings";
import { computePrice } from "../utils/price";
import { buildBackendUrl } from "../utils/backend";
import FabricDetailModal, { FabricDetail } from "./FabricDetailModal";

export type Panel = "FABRIC" | "STYLE" | "ACCENTS";

type Props = {
  config: SuitState;
  dispatch: React.Dispatch<any>;
  activePanel?: Panel | null;
  onPanelChange?: (panel: Panel | null) => void;
};

const NAV = [
  { id: "FABRIC" as const, label: "Tkanine", icon: "/custom-suits/icons/iconfabric.png" },
  { id: "STYLE" as const, label: "Stil", icon: "/custom-suits/icons/iconstyle.png" },
  { id: "ACCENTS" as const, label: "Detalji", icon: "/custom-suits/icons/iconaccents.png" },
];

const FABRIC_PAGE_SIZE = 12;

const toneLabels: Record<"all" | "light" | "medium" | "dark", string> = {
  all: "Svi tonovi",
  light: "Svetli",
  medium: "Srednji",
  dark: "Tamni",
};

const drawerPanelVariants: Variants = {
  hidden: { x: "-35%", opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 170, damping: 26 },
  },
  exit: { x: "-35%", opacity: 0, transition: { duration: 0.2 } },
};

const drawerOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25 },
  },
  exit: { opacity: 0, transition: { duration: 0.25 } },
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
  const gridCols = columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2";
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-gray-500">{title}</p>
      <div className={`grid gap-2 ${gridCols}`}>
        {options.map((option) => {
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelect(option.id)}
              className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                active
                  ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              <p className="text-sm font-semibold leading-tight">{option.label}</p>
              {option.hint && (
                <p className={`text-[12px] ${active ? "text-white/80" : "text-gray-500"}`}>{option.hint}</p>
              )}
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
      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400">Prilagodi</p>
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

const PanelLoading = ({ title, onClose }: { title: string; onClose: () => void }) => (
  <>
    <DrawerHeader title={title} onClose={onClose} />
    <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Pripremam panel...</div>
  </>
);

const FabricCard = React.memo(
  ({
    fabric,
    active,
    onSelect,
    onDetail,
    hasDetail,
  }: {
    fabric: any;
    active: boolean;
    onSelect: () => void;
    onDetail?: () => void;
    hasDetail?: boolean;
  }) => (
    <div
      className={`rounded-2xl border bg-white text-left transition ${
        active ? "border-gray-900 shadow-md" : "border-gray-200 hover:border-gray-400"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="relative h-20 w-24 overflow-hidden rounded-xl bg-gray-100">
          <img
            src={fabric.texture}
            alt={fabric.name}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
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
      {hasDetail && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={onDetail}
            className="text-[11px] font-semibold text-gray-700 underline underline-offset-4 transition hover:text-gray-900"
          >
            Detalji tkanine
          </button>
        </div>
      )}
    </div>
  )
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
  return (
    <div className="fixed inset-0 z-[60] flex lg:hidden">
      <motion.div
        className="pointer-events-auto flex h-full w-[56vw] min-w-[210px] max-w-[280px] flex-col overflow-hidden transform bg-white shadow-2xl"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={drawerPanelVariants}
      >
        {children}
      </motion.div>
      <motion.button
        aria-label="Close"
        onClick={onClose}
        className="pointer-events-auto h-full flex-1 bg-black/25"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={drawerOverlayVariants}
      />
    </div>
  );
};

function MobileControls({ config, dispatch, activePanel, onPanelChange }: Props) {
  const [internalPanel, setInternalPanel] = useState<Panel | null>(null);
  const currentPanel = activePanel !== undefined ? activePanel : internalPanel;
  const [readyPanel, setReadyPanel] = useState<Panel | null>(null);
  const [isPending, startTransition] = useTransition();
  const [detailFabric, setDetailFabric] = useState<FabricDetail | null>(null);
  const setPanel = (panel: Panel | null) => {
    setInternalPanel(panel);
    onPanelChange?.(panel);
  };
  const [savingCart, setSavingCart] = useState(false);
  useEffect(() => {
    if (activePanel !== undefined) {
      setInternalPanel(activePanel);
    }
  }, [activePanel]);
  useEffect(() => {
    if (!currentPanel) {
      setReadyPanel(null);
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      startTransition(() => setReadyPanel(currentPanel));
    });
    return () => window.cancelAnimationFrame(raf);
  }, [currentPanel, startTransition]);
  const [toneFilter, setToneFilter] = useState<"all" | "light" | "medium" | "dark">("all");
  const [fabricQuery, setFabricQuery] = useState("");
  const [sort, setSort] = useState<"date_desc" | "date_asc">("date_desc");
  const deferredQuery = useDeferredValue(fabricQuery);
  const fabricListRef = useRef<HTMLDivElement | null>(null);
  const fabricSentinelRef = useRef<HTMLDivElement | null>(null);
  const [visibleFabricCount, setVisibleFabricCount] = useState(FABRIC_PAGE_SIZE);

  const resolveFabricDetail = useCallback((fabric: any): FabricDetail | null => {
    const detailImage =
      fabric?.detailImage ??
      fabric?.detail_image ??
      fabric?.detailImageUrl ??
      fabric?.detail_image_url ??
      fabric?.zoom1 ??
      fabric?.zoom2 ??
      null;
    const detailText = fabric?.detailText ?? fabric?.detail_text ?? null;
    if (!detailImage && !detailText) return null;
    return {
      name: fabric?.name,
      code: fabric?.code,
      texture: fabric?.texture,
      detailImage,
      detailText,
    };
  }, []);

  const isFabricPanel = currentPanel === "FABRIC";
  const isAccentsPanel = currentPanel === "ACCENTS";

  const { fabrics, loading: fabricsLoading, error: fabricsError } = useFabrics(
    {
      tone: toneFilter === "all" ? undefined : toneFilter,
      sort: "created_at",
      order: sort === "date_desc" ? "desc" : "asc",
    },
    { enabled: isFabricPanel }
  );
  const { buttons, loading: buttonsLoading, error: buttonsError } = useButtons({ enabled: isAccentsPanel });
  const { linings, loading: liningsLoading, error: liningsError } = useLinings(config.styleId, {
    enabled: isAccentsPanel,
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
    const query = deferredQuery.trim().toLowerCase();
    if (!query) return fabricsNormalized;
    return fabricsNormalized.filter((fabric: any) => {
      const name = String(fabric.name || "").toLowerCase();
      const code = String(fabric.code || "").toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [deferredQuery, fabricsNormalized]);

  useEffect(() => {
    setVisibleFabricCount(FABRIC_PAGE_SIZE);
  }, [currentPanel, deferredQuery, sort, toneFilter, fabricsNormalized.length]);

  useEffect(() => {
    if (currentPanel !== "FABRIC") return;
    const sentinel = fabricSentinelRef.current;
    if (!sentinel) return;
    if (visibleFabricCount >= filteredFabrics.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleFabricCount((count) => Math.min(count + FABRIC_PAGE_SIZE, filteredFabrics.length));
      },
      { root: fabricListRef.current, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentPanel, filteredFabrics.length, visibleFabricCount]);

  const visibleFabrics = useMemo(
    () => filteredFabrics.slice(0, visibleFabricCount),
    [filteredFabrics, visibleFabricCount]
  );

  const price = computePrice(config, suits);
  const fabricPrice = useMemo(
    () => fabricsNormalized.find((fabric: any) => fabric.id === config.colorId)?.price ?? 0,
    [config.colorId, fabricsNormalized]
  );
  const currentSuit = suits.find((s) => s.id === config.styleId);
  const lapels = currentSuit?.lapels ?? [];
  const selectedLapelId = config.lapelId || lapels[0]?.id;
  const activeLapel = lapels.find((lapel) => lapel.id === selectedLapelId) || lapels[0];
  const selectedLapelWidthId = config.lapelWidthId || activeLapel?.widths?.[0]?.id;
  const liningOptions = useMemo(() => {
    const fromRemote =
      linings.length > 0
        ? linings.map((l) => ({
            id: l.id,
            name: l.name,
            layers: [
              l.base ? { id: "interior_base", name: "Base", src: l.base } : null,
              l.left ? { id: "interior_left", name: "Left", src: l.left } : null,
              l.right ? { id: "interior_right", name: "Right", src: l.right } : null,
            ].filter(Boolean),
          }))
        : [];
    if (fromRemote.length) return fromRemote;
    return currentSuit?.interiors || [];
  }, [currentSuit?.interiors, linings]);
  const measurementUrl = useMemo(() => {
    const json = JSON.stringify(config);
    const url = new URL(typeof window !== "undefined" ? window.location.origin : "http://localhost");
    url.pathname = "/custom-suits/measure";
    url.searchParams.set("config", json);
    return url.toString();
  }, [config]);

  const uploadUrl = "/admin/fabrics";
  const buttonCmsUrl = "/admin/buttons";
  const liningCmsUrl = "/admin/linings";
  const resetFabricFilters = () => {
    setToneFilter("all");
    setSort("date_desc");
    setFabricQuery("");
  };
  const resetStyleOptions = () => {
    if (!currentSuit) return;
    const lapel = currentSuit.lapels?.[0];
    const width = lapel?.widths?.[0];
    if (lapel?.id) dispatch({ type: "SET_LAPEL", payload: lapel.id });
    if (width?.id) dispatch({ type: "SET_LAPEL_WIDTH", payload: width.id });
    const pocket = currentSuit.pockets?.[0];
    if (pocket?.id) dispatch({ type: "SET_POCKET", payload: pocket.id });
    const breast = currentSuit.breastPocket?.[0];
    if (breast?.id) dispatch({ type: "SET_BREAST_POCKET", payload: breast.id });
    const cuff = currentSuit.cuffs?.[0];
    if (cuff?.id) dispatch({ type: "SET_CUFF", payload: cuff.id });
  };
  const resetAccents = () => {
    const defaultButton = buttons?.[0];
    if (defaultButton?.id) dispatch({ type: "SET_BUTTON", payload: defaultButton.id });
    const defaultInterior = (liningOptions || [])[0];
    if (defaultInterior?.id) dispatch({ type: "SET_INTERIOR", payload: defaultInterior.id });
    if (config.showShirt) dispatch({ type: "TOGGLE_SHIRT" });
  };
  const storeOrderId = (orderId: string) => {
    localStorage.setItem("lastOrderId", orderId);
    const existingRaw = localStorage.getItem("suitCart");
    if (!existingRaw) return;
    const parsed = JSON.parse(existingRaw);
    if (Array.isArray(parsed) && parsed.length) {
      parsed[0] = { ...parsed[0], orderId };
      localStorage.setItem("suitCart", JSON.stringify(parsed));
    }
  };

  const handleAddToCart = async () => {
    if (savingCart) return;
    try {
      setSavingCart(true);

      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        config,
        price,
        addedAt: new Date().toISOString(),
      };
      const existingRaw = localStorage.getItem("suitCart");
      const parsed = existingRaw ? JSON.parse(existingRaw) : [];
      parsed.unshift(entry);
      localStorage.setItem("suitCart", JSON.stringify(parsed));

      try {
        const res = await fetch(buildBackendUrl("orders"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config,
            price: price.total,
            fabricId: config.colorId,
            contact: null,
            status: "draft",
          }),
        });
        const json = await res.json();
        if (json?.success && json?.orderId) {
          storeOrderId(json.orderId);
        } else if (!json?.success) {
          console.error("Order sync failed", json?.message);
        }
      } catch (err) {
        console.error("Order sync failed", err);
      }

      alert("Dizajn je sacuvan u korpu. Zavrsite porudzbinu u sledecem koraku.");
    } catch (err) {
      console.error("Add to cart failed", err);
      alert("Nije moguce sacuvati dizajn trenutno. Pokusajte ponovo.");
    } finally {
      setSavingCart(false);
    }
  };

  const renderFabricPanel = () => (
    <>
      <DrawerHeader title="Biblioteka tkanina" onClose={() => setPanel(null)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="space-y-3 border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
            <span>Tkanine</span>
            <div className="flex items-center gap-3">
              <button onClick={resetFabricFilters} className="underline-offset-4 hover:text-gray-900" type="button">
                Resetuj
              </button>
              <a
                href={uploadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-4 hover:text-gray-900"
              >
                CMS
              </a>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={fabricQuery}
              onChange={(e) => setFabricQuery(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
              placeholder="Pretrazi tkaninu ili sifru"
            />
            <select
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
            >
              <option value="date_desc">Najnovije</option>
              <option value="date_asc">Najstarije</option>
            </select>
          </div>
          {fabricsError && <p className="text-[11px] text-orange-600">{fabricsError}</p>}
        </div>
        <div
          ref={fabricListRef}
          className="flex-1 space-y-3 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-28"
          style={{ contentVisibility: "auto" }}
        >
          {fabricsLoading ? (
            <p className="text-sm text-gray-500">Ucitavanje tkanina...</p>
          ) : filteredFabrics.length === 0 ? (
            <p className="text-sm text-gray-500">Nema tkanina za zadate filtere.</p>
          ) : (
            <>
              {visibleFabrics.map((fabric: any) => {
                const detailInfo = resolveFabricDetail(fabric);
                return (
                  <FabricCard
                    key={fabric.id}
                    fabric={fabric}
                    active={config.colorId === fabric.id}
                    onSelect={() => dispatch({ type: "SET_COLOR", payload: fabric.id })}
                    hasDetail={Boolean(detailInfo)}
                    onDetail={detailInfo ? () => setDetailFabric(detailInfo) : undefined}
                  />
                );
              })}
              {filteredFabrics.length > visibleFabrics.length && (
                <div
                  ref={fabricSentinelRef}
                  className="flex h-10 items-center justify-center text-[11px] text-gray-400"
                >
                  Ucitavam jos...
                </div>
              )}
            </>
          )}
        </div>
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3">
          <button
            onClick={() => setPanel(null)}
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
      <DrawerHeader title="Stil" onClose={() => setPanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-14">
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          <span>Reset opcija</span>
          <button onClick={resetStyleOptions} className="underline-offset-4 hover:text-gray-900" type="button">
            Resetuj
          </button>
        </div>
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
            title="Sirina revera"
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
      <DrawerHeader title="Detalji" onClose={() => setPanel(null)} />
      <div className="flex-1 space-y-4 overflow-y-auto overscroll-y-auto touch-pan-y px-4 py-4 pb-14">
        <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
          <span>Reset detalja</span>
          <button onClick={resetAccents} className="underline-offset-4 hover:text-gray-900" type="button">
            Resetuj
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Dugmad</p>
          <a
            href={buttonCmsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:text-gray-900"
          >
            CMS
          </a>
        </div>
        {buttonsError && <p className="text-[11px] text-orange-600">{buttonsError}</p>}
        {buttonsLoading ? (
          <p className="text-xs text-gray-500">Ucitavanje dugmadi...</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {buttons.map((btn) => {
              const active = config.buttonId === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => dispatch({ type: "SET_BUTTON", payload: btn.id })}
                  className={`flex flex-col items-center gap-1 rounded-xl border bg-white px-2 py-2 text-center transition ${
                    active ? "border-gray-900 shadow-sm" : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <div className="relative h-12 w-full">
                    {btn.image_url ? (
                      <img
                        src={btn.image_url}
                        alt={btn.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-gray-400">N/A</div>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold leading-tight text-gray-800">{btn.name}</p>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-sm font-semibold text-gray-900">Postava</p>
          <a
            href={liningCmsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-medium uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:text-gray-900"
          >
            CMS
          </a>
        </div>
        {liningsError && <p className="text-[11px] text-orange-600">{liningsError}</p>}
        {liningsLoading ? (
          <p className="text-xs text-gray-500">Ucitavanje postava...</p>
        ) : (
          <ChoiceGroup
            title="Izbor postave"
            options={(liningOptions || []).map((option: any) => ({ id: option.id, label: option.name }))}
            selectedId={config.interiorId}
            onSelect={(id) => dispatch({ type: "SET_INTERIOR", payload: id })}
          />
        )}

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
            <p className="text-sm font-semibold text-gray-800">Prikazi sloj kosulje</p>
            <p className="text-[11px] text-gray-500">Pomaze pri vizualizaciji revera i linija depova.</p>
          </div>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SHIRT" })}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              config.showShirt ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600"
            }`}
          >
            {config.showShirt ? "Ukljuceno" : "Iskljuceno"}
          </button>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 text-[12px] text-gray-600">
          Personalni monogram stize uskoro. Javite nam sta vam treba i stavicemo ga u prioritet.
        </div>
      </div>
    </>
  );
  const drawerBody = (() => {
    if (!currentPanel) return null;
    if (readyPanel !== currentPanel || isPending) {
      const title =
        currentPanel === "FABRIC" ? "Biblioteka tkanina" : currentPanel === "STYLE" ? "Stil" : "Detalji";
      return <PanelLoading title={title} onClose={() => setPanel(null)} />;
    }
    if (currentPanel === "FABRIC") return renderFabricPanel();
    if (currentPanel === "STYLE") return renderStylePanel();
    if (currentPanel === "ACCENTS") return renderAccentsPanel();
    return null;
  })();

  return (
    <>
      <div className="lg:hidden">
        <div className="fixed bottom-0 left-0 right-0 z-30">
          <div className="mx-auto w-full max-w-md border-t border-black/5 bg-white/95 px-3 pb-3 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              {NAV.map((item) => {
                const active = currentPanel === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setPanel(item.id)}
                    className={`flex flex-1 flex-col items-center gap-1 py-1 transition ${
                      active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center">
                      <img src={item.icon} alt={item.label} className="h-5 w-5 object-contain opacity-80" />
                    </span>
                    <span className="text-[9px] font-semibold tracking-[0.2em] uppercase">{item.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-gray-900">Vase odelo</p>
                <p className="text-xl font-semibold text-gray-900">{price.total} EUR</p>
                <p className="text-[10px] text-gray-500">Tkanina {fabricPrice} EUR</p>
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = measurementUrl;
                  }}
                  className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-500 underline-offset-4 hover:text-gray-900"
                >
                  Nastavi na merenje
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={savingCart}
                className="rounded-full bg-[#ff7a00] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e86d00] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Sacuvaj dizajn
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {currentPanel && (
          <Drawer panel={currentPanel} onClose={() => setPanel(null)}>
            {drawerBody}
          </Drawer>
        )}
      </AnimatePresence>
      <FabricDetailModal fabric={detailFabric} onClose={() => setDetailFabric(null)} />
    </>
  );
}

export default MobileControls;



