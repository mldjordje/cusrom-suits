"use client";

import React, { useEffect, useRef, useState } from "react";
import SuitPreview from "../components/SuitPreview";
import { useSuitConfigurator } from "../hooks/useSuitConfigurator";
import { Level } from "../utils/visual";

function useFPS() {
  const [fps, setFps] = useState(0);
  const last = useRef(performance.now());
  const frames = useRef(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const now = performance.now();
      frames.current++;
      if (now - last.current >= 1000) {
        setFps(frames.current);
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

export default function DebugPreviewPage() {
  const [config] = useSuitConfigurator({ styleId: "double_6btn", colorId: "blue" });
  const [showGrid, setShowGrid] = useState(false);
  const [level, setLevel] = useState<Level>('medium');
  const fps = useFPS();
  return (
    <div className="min-h-screen p-4">
      <div className="flex gap-4 mb-4 items-center">
        <button onClick={() => setShowGrid((s)=>!s)} className="px-3 py-1 border rounded">{showGrid? 'Hide' : 'Show'} Grid</button>
        <label className="text-sm">Level:
          <select value={level} onChange={(e)=>setLevel(e.target.value as Level)} className="ml-2 border p-1 rounded text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <span className="text-sm text-gray-600">FPS: {fps}</span>
        <span className="text-sm text-gray-600">Wheel to zoom, drag to pan fabric. Use for quick checks.</span>
      </div>
      <div className={showGrid ? 'bg-[radial-gradient(circle,_#eee_1px,transparent_1px)] bg-[length:16px_16px]' : ''}>
        <SuitPreview config={config} level={level} />
      </div>
    </div>
  );
}
