// components/OptionGroup.tsx
import React from "react";

type Option = {
  id: string;
  name: string;
  image?: string;
};

type OptionGroupProps = {
  title: string;
  options: Option[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

const OptionGroup: React.FC<OptionGroupProps> = ({ title, options, selectedId, onSelect }) => {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onSelect(o.id)}
            className={`p-1 border rounded ${selectedId === o.id ? 'ring-2 ring-blue-500' : 'border-gray-200'}`}
          >
            {o.image ? (
              <img src={o.image} alt={o.name} className="w-12 h-12 object-cover"/>
            ) : (
              <span className="text-xs">{o.name}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OptionGroup;
