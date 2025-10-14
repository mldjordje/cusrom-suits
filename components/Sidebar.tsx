import React from "react";
import { models, colors } from "../data";

type Props = {
  model: string;
  color: string;
  onModelChange: (m: string) => void;
  onColorChange: (c: string) => void;
};

const Sidebar: React.FC<Props> = ({ model, color, onModelChange, onColorChange }) => {
  return (
    <aside className="w-full md:w-80 p-4 border-b md:border-b-0 md:border-r border-gray-200 bg-white/60 backdrop-blur sticky top-0">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Model</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {models.map(m => (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                className={`text-left px-3 py-2 rounded-xl border transition
                ${model === m.id ? "border-black font-semibold" : "border-gray-300 hover:border-black"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Boja</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {colors.map(c => (
              <button
                key={c.id}
                onClick={() => onColorChange(c.id)}
                className={`h-10 rounded-xl border ${color === c.id ? "border-black" : "border-gray-300 hover:border-black"}`}
                title={c.label}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
