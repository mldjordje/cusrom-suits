"use client";
import React from "react";

type Props = {
  iconSrc?: string;
  label: string;
  selected?: boolean;
  onClick?: () => void;
};

const OptionCard: React.FC<Props> = ({ iconSrc = "/icons/placeholder-style.svg", label, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={[
        "group flex flex-col items-center justify-center gap-2 rounded-xl border bg-white",
        "px-3 py-4 transition",
        selected ? "border-[#111] shadow-sm" : "border-[#dddddd] hover:border-[#111]"
      ].join(" ")}
    >
      <div className="w-16 h-16 flex items-center justify-center rounded-md bg-[#fafafa] overflow-hidden">
        <img src={iconSrc} alt={label} className="max-w-[80%] max-h-[80%] object-contain opacity-80 group-hover:opacity-100" />
      </div>
      <span className={["text-xs text-center leading-tight", selected ? "text-[#111] font-medium" : "text-[#666]"].join(" ")}>
        {label}
      </span>
    </button>
  );
};

export default OptionCard;
