"use client";

import React, { useEffect, useState } from "react";
import SuitPreview from "../components/SuitPreview";
import { useSuitConfigurator } from "../hooks/useSuitConfigurator";
import { suits } from "../data/options";

const LEVELS = {
  low: { contrast: 0.92, saturate: 0.95 },
  medium: { contrast: 1, saturate: 1 },
  high: { contrast: 1.12, saturate: 1.05 },
} as const;

const DEFAULT_STYLE = suits[0]?.id || "single_1btn";
const DEFAULT_COLOR = suits[0]?.colorId || "blue";

type Level = keyof typeof LEVELS;

export default function CustomSuitDebugPage() {
  const [config, dispatch] = useSuitConfigurator({ styleId: DEFAULT_STYLE, colorId: DEFAULT_COLOR });
  const [fps, setFps] = useState(0);
  const [level, setLevel] = useState<Level>("medium");

  useEffect(() => {
    let frames = 0;
    let prev = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      frames++;
      if (now - prev >= 1000) {
        setFps(Math.round((frames * 1000) / (now - prev)));
        frames = 0;
        prev = now;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row">
        <div className="flex-1 rounded-xl bg-white/5 p-4 shadow-2xl">
          <div
            className="rounded-lg bg-white p-4"
            style={{
              filter: `contrast(${LEVELS[level].contrast}) saturate(${LEVELS[level].saturate})`,
              transition: "filter 150ms ease",
            }}
          >
            <SuitPreview config={config} level={level} />
          </div>
        </div>

        <aside className="w-full max-w-sm space-y-6 rounded-xl bg-white/5 p-5 text-sm">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">Performance</h2>
            <div className="flex items-baseline gap-2 text-3xl font-bold">
              <span>{fps}</span>
              <span className="text-base font-normal text-white/60">fps</span>
            </div>
            <p className="text-white/60">Realtime measurement via requestAnimationFrame.</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">Contrast level</h2>
            <div className="flex gap-2">
              {(Object.keys(LEVELS) as Level[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setLevel(option)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize transition ${
                    level === option
                      ? "border-white bg-white text-black"
                      : "border-white/30 text-white/70 hover:border-white/60"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">Suit styles</h2>
            <div className="flex flex-wrap gap-2">
              {suits.map((model) => (
                <button
                  key={model.id}
                  onClick={() => dispatch({ type: "SET_STYLE", payload: model.id })}
                  className={`rounded-md border px-3 py-1 text-xs ${
                    config.styleId === model.id
                      ? "border-white bg-white text-black"
                      : "border-white/30 text-white/70 hover:border-white/60"
                  }`}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-white">Fabric ID</h2>
            <input
              value={config.colorId || ""}
              onChange={(e) => dispatch({ type: "SET_COLOR", payload: e.target.value })}
              className="w-full rounded-md border border-white/30 bg-transparent px-3 py-2 text-white focus:border-white"
              placeholder="npr. blue"
            />
            <p className="mt-1 text-white/50">Manual unos fabric ID-ja koji dolazi iz fabrics.php.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
