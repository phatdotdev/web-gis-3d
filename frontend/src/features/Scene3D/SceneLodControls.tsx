import React from "react";
import { Box, Boxes, Layers3 } from "lucide-react";

import type { SceneLodLevel } from "../../types/backend";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectActiveLodLevel, setActiveLodLevel } from "../../store/mapSlice";

const lodOptions: Array<{
  level: SceneLodLevel;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    level: 0,
    label: "LOD0",
    description: "Model gốc",
    icon: Box,
  },
  {
    level: 1,
    label: "LOD1",
    description: "Thành phần",
    icon: Boxes,
  },
  {
    level: 2,
    label: "LOD2",
    description: "Chi tiet",
    icon: Layers3,
  },
];

export const SceneLodControls: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeLodLevel = useAppSelector(selectActiveLodLevel);

  return (
    <div className="w-[250px] border border-[#d5dde6] bg-white/95 backdrop-blur rounded-lg p-2.5 flex flex-col gap-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-bold text-[#1e293b]">Level of detail</div>
        <span className="text-[10px] font-bold text-[#2563eb] bg-[#eff6ff] px-2 py-0.5 rounded">
          LOD{activeLodLevel}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {lodOptions.map((option) => {
          const Icon = option.icon;
          const active = activeLodLevel === option.level;
          return (
            <button
              key={option.level}
              type="button"
              onClick={() => dispatch(setActiveLodLevel(option.level))}
              className={`h-[58px] inline-flex flex-col items-center justify-center gap-0.5 rounded border px-1.5 py-1.5 text-[10.5px] font-semibold cursor-pointer transition-colors ${
                active
                  ? "bg-[#eff6ff] border-[#2563eb] text-[#1d4ed8]"
                  : "bg-[#f8fafc] border-[#e2e8f0] text-[#475569] hover:border-[#93c5fd] hover:text-[#2563eb]"
              }`}
              title={`${option.label} - ${option.description}`}
            >
              <Icon size={14} />
              <span>{option.label}</span>
              <span className="text-[9px] font-medium opacity-80 truncate max-w-full">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
