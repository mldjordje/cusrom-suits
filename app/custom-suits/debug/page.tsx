"use client";

import React, { useState } from "react";
import SuitPreview from "../components/SuitPreview";
import { useSuitConfigurator } from "../hooks/useSuitConfigurator";

export default function DebugPreviewPage() {
  const [config, dispatch] = useSuitConfigurator({ styleId: "double_6btn", colorId: "blue" });
  const [showGrid, setShowGrid] = useState(false);
  return (
    <div className="min-h-screen p-4">
      <div className="flex gap-4 mb-4 items-center">
        <button onClick={() => setShowGrid((s)=>!s)} className="px-3 py-1 border rounded">{showGrid? 'Hide' : 'Show'} Grid</button>
        <span className="text-sm text-gray-600">Wheel to zoom, drag to pan fabric. Use as a quick visual test.</span>
      </div>
      <div className={showGrid ? 'bg-[radial-gradient(circle,_#eee_1px,transparent_1px)] bg-[length:16px_16px]' : ''}>
        <SuitPreview config={config} />
      </div>
    </div>
  );
}

