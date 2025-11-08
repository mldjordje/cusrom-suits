"use client";

import React, { useEffect, useRef, useState } from "react";
import BaseOutlines from './layers/BaseOutlines';
import BaseLayer from './layers/BaseLayer';
import FabricUnion from './layers/FabricUnion';
import PerPartOverlays from './layers/PerPartOverlays';
import GlobalOverlays from './layers/GlobalOverlays';
import { Tone, Level, getToneConfig, toneBlend } from "../utils/visual";
import { suits, SuitLayer } from "../data/options";
import { SuitState } from "../hooks/useSuitConfigurator";
import { getTransparentCdnBase, getBackendBase } from "../utils/backend";

// CDN helpers
const cdnTransparent = getTransparentCdnBase();
const fileBase = (p: string) => {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
};
const imageSet = (webp: string, png: string) => `image-set(url("${webp}") type("image/webp"), url("${png}") type("image/png"))`;
const sleevesNameFix = (base: string) => (base === 'sleeves' ? 'interior+sleeves' : base);
const cdnPair = (src: string) => {
  const base = fileBase(src).replace(/\.(png|jpg|jpeg|webp)$/i, "");
  return { webp: `${cdnTransparent}${base}.webp`, png: `${cdnTransparent}${base}.png` } as const;
};
const shadingPair = (src: string) => {
  const base = sleevesNameFix(fileBase(src).replace(/\.(png|jpg|jpeg|webp)$/i, ""));
  return { webp: `${cdnTransparent}shading/${base}.webp`, png: `${cdnTransparent}shading/${base}.png` } as const;
};
const specularPair = (src: string) => {
  const base = sleevesNameFix(fileBase(src).replace(/\.(png|jpg|jpeg|webp)$/i, ""));
  return { webp: `${cdnTransparent}specular/${base}.webp`, png: `${cdnTransparent}specular/${base}.png` } as const;
};

type Props = { config: SuitState; level?: Level };

export default function SuitPreview({ config, level = 'medium' }: Props) {
  const [fabrics, setFabrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fabricAvgColor, setFabricAvgColor] = useState<string | null>(null);
  const [jacketUnionMask, setJacketUnionMask] = useState<string | null>(null);

  // Pan/zoom for fabric
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

  const currentSuit = suits.find((s) => s.id === config.styleId);
  if (!currentSuit) return null;

  // Load fabrics list
  useEffect(() => {
    let cancelled = false;
    const url = `${getBackendBase()}fabrics.php`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.success) setFabrics(data.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const selectedFabric = fabrics.find((f) => String(f.id) === String(config.colorId));
  const fabricTexture = selectedFabric?.texture || "";

  const tb = toneBlend(selectedFabric?.tone, level);
  const vis = getToneConfig((selectedFabric?.tone as Tone) || undefined, level);

  // Base color under weave by tone
  const toneBaseColor = (() => {
    const t = (selectedFabric?.tone || "medium") as Tone;
    if (t === "dark") return "#2b2b2b";
    if (t === "light") return "#c8c8c8";
    return "#8f8f8f";
  })();

  // Average fabric color to better match hue
  useEffect(() => {
    if (!fabricTexture) { setFabricAvgColor(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        const ctx = c.getContext("2d"); if (!ctx) return;
        const w = 32, h = 32; c.width = w; c.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;
        let r=0,g=0,b=0,n=0; for (let i=0;i<d.length;i+=4){ const a=d[i+3]; if(a<10) continue; r+=d[i]; g+=d[i+1]; b+=d[i+2]; n++; }
        if (n>0){ const toHex=(x:number)=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0"); setFabricAvgColor(`#${toHex(r/n)}${toHex(g/n)}${toHex(b/n)}`);} else setFabricAvgColor(null);
      } catch { setFabricAvgColor(null); }
    };
    img.onerror = () => setFabricAvgColor(null);
    img.src = fabricTexture;
  }, [fabricTexture]);

  // Lapel swap utility
  const swapLapelInPath = (src: string, lapelType?: string, lapelWidth?: string) => {
    const type = lapelType ?? "notch";
    const width = lapelWidth ?? "medium";
    return src.replace(/lapel_(narrow|medium|wide)\+style_lapel_(notch|peak)/, `lapel_${width}+style_lapel_${type}`);
  };

  // Build jacket union mask (torso+sleeves+bottom) to remove seams
  useEffect(() => {
    const baseLayersLocal: SuitLayer[] = currentSuit?.layers || [];
    const selectedLapelLocal = currentSuit?.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit?.lapels?.[0];
    const selectedLapelWidthLocal = selectedLapelLocal?.widths.find((w) => w.id === config.lapelWidthId) || selectedLapelLocal?.widths.find((w) => w.id === "medium") || selectedLapelLocal?.widths?.[0];
    const adjusted = baseLayersLocal.map((l) => (l.id === "torso" ? { ...l, src: swapLapelInPath(l.src, selectedLapelLocal?.id, selectedLapelWidthLocal?.id) } : l));
    const torso = adjusted.find((x) => x.id === "torso");
    const sleeves = adjusted.find((x) => x.id === "sleeves");
    const bottom = adjusted.find((x) => x.id === "bottom");
    const parts = [torso, sleeves, bottom].filter(Boolean) as SuitLayer[];
    if (!parts.length) { setJacketUnionMask(null); return; }

    let cancelled = false;
    (async () => {
      try {
        const c = document.createElement("canvas"); c.width = 600; c.height = 733;
        const ctx = c.getContext("2d"); if (!ctx) return;
        ctx.clearRect(0,0,c.width,c.height);
        for (const L of parts) {
          const pair = cdnPair(L.src);
          const tryLoad = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => { const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>resolve(i); i.onerror=reject; i.src=url; });
          let img: HTMLImageElement | null = null;
          try { img = await tryLoad(pair.webp); } catch { try { img = await tryLoad(pair.png); } catch {} }
          if (!img) continue;
          const s = Math.min(c.width / img.width, c.height / img.height);
          const w = Math.round(img.width * s), h = Math.round(img.height * s);
          const dx = Math.round((c.width - w) / 2), dy = Math.round((c.height - h) / 2);
          ctx.drawImage(img, dx, dy, w, h);
        }
        if (!cancelled) setJacketUnionMask(c.toDataURL("image/png"));
      } catch { if (!cancelled) setJacketUnionMask(null); }
    })();
    return () => { cancelled = true; };
  }, [currentSuit, config.lapelId, config.lapelWidthId, fabricTexture]);

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 text-sm">Učitavanje tkanina…</div>;
  if (!selectedFabric) return <div className="flex items-center justify-center h-full text-gray-500 text-sm">Izaberite tkaninu.</div>;

  // Prepare layers with lapel swap
  const baseLayers: SuitLayer[] = currentSuit.layers || [];
  const selectedLapel = currentSuit.lapels?.find((l) => l.id === config.lapelId) ?? currentSuit.lapels?.[0];
  const selectedLapelWidth = selectedLapel?.widths.find((w) => w.id === config.lapelWidthId) || selectedLapel?.widths.find((w) => w.id === "medium") || selectedLapel?.widths?.[0];
  const suitLayers = baseLayers.map((l) => (l.id === "torso" ? { ...l, src: swapLapelInPath(l.src, selectedLapel?.id, selectedLapelWidth?.id) } : l));
  const pants = suitLayers.find((l) => l.id === "pants");
  const allJacketLayers = suitLayers.filter((x) => x.id === 'torso' || x.id === 'sleeves' || x.id === 'bottom');

  // Canvas sizes
  const JACKET_CANVAS = { w: 600, h: 733 } as const;
  const PANTS_CANVAS = { w: 600, h: 350 } as const;

  // Pan/zoom handlers
  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => { e.preventDefault(); const d = -e.deltaY; setScale((s) => Math.min(3, Math.max(1, s + d * 0.0015))); };
  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => { dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y, active: true }; };
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => { if (!dragRef.current.active) return; setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); };
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => { if (dragRef.current.active) dragRef.current.active = false; };

  // Optional interior layers
  const interiorLayers: SuitLayer[] | undefined = (() => {
    const def = currentSuit.interiors?.[0]; const active = config.interiorId ?? def?.id; const found = currentSuit.interiors?.find((i) => i.id === active);
    return Array.isArray(found?.layers) ? found.layers : undefined;
  })();

  return (
    <div className="w-full select-none bg-white">
      <div
        className="relative mx-auto"
        style={{ width: '100%', aspectRatio: '600 / 733', maxWidth: 720 }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {interiorLayers?.map((l) => (
          <img key={`int-${l.id}`} src={l.src} alt={l.name} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        ))}
        {config.showShirt && (
          <img
            src={`${cdnTransparent}shirt_to_jacket_open.png`}
            onError={(e) => { const local = '/assets/suits/transparent/shirt_to_jacket_open.png'; if (e.currentTarget.src !== local) e.currentTarget.src = local; }}
            alt="Shirt"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {/* Jacket: outlines */}
        <BaseOutlines layers={allJacketLayers} cdnPair={cdnPair} imageSet={imageSet} opacity={vis.baseOutlineOpacity} />
        {/* Jacket: tone base + fabric (union) */}
        <BaseLayer maskUrl={jacketUnionMask ?? undefined} color={fabricAvgColor || toneBaseColor} />
        <FabricUnion fabricUrl={fabricTexture} maskUrl={jacketUnionMask ?? undefined} tone={selectedFabric?.tone as Tone} canvasSize={JACKET_CANVAS} scale={scale} offset={offset} filter={tb.filter} />
        {/* Jacket: shading + specular per-part (graceful fallback) */}
        <PerPartOverlays layers={allJacketLayers} tone={selectedFabric?.tone as Tone} level={level} shadingPair={shadingPair} specularPair={specularPair} />
        {/* Jacket: global AO + micro-noise */}
        <GlobalOverlays jacketUnionMask={jacketUnionMask ?? undefined} noiseData={"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWMYefz/fwAI1QLS/7j4OQAAAABJRU5ErkJggg=="} vignetteStrength={vis.vignetteStrength} noiseOpacity={vis.noiseOpacity} />
      </div>

      {/* Pants */}
      {pants && (
        <div className="relative mx-auto mt-2" style={{ width: '100%', aspectRatio: '600 / 350', maxWidth: 720 }}>
          <BaseLayer maskUrl={cdnPair(pants.src).png} color={fabricAvgColor || toneBaseColor} />
          <FabricUnion fabricUrl={fabricTexture} maskUrl={cdnPair(pants.src).png} tone={selectedFabric?.tone as Tone} canvasSize={PANTS_CANVAS} scale={scale} offset={offset} filter={tb.filter} />
          <PerPartOverlays layers={[pants]} tone={selectedFabric?.tone as Tone} level={level} shadingPair={shadingPair} specularPair={specularPair} />
          <BaseOutlines layers={[pants]} cdnPair={cdnPair} imageSet={imageSet} opacity={vis.pantsOutlineOpacity} />
        </div>
      )}
    </div>
  );
}

