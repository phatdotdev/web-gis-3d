import React from "react";
import { Crosshair, Edit2, Trash2, Box, Compass, Info } from "lucide-react";

import { useAppDispatch } from "../../store/hooks";
import { goToEntity } from "../../store/mapSlice";
import type { BackendSpatialEntity } from "../../types/backend";
import { fmtCoord, getEntityCenter } from "../../utils/geometry";

type Props = {
  entity: BackendSpatialEntity;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const labelClasses = "text-[11px] font-semibold text-[#64748b]";
const valueClasses = "text-[12px] font-semibold text-[#1e293b] font-mono truncate";

export const FeatureDetail: React.FC<Props> = ({
  entity,
  onEdit,
  onDelete,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const center = getEntityCenter(entity.geometry);

  const handleGoTo = () => {
    dispatch(goToEntity(entity));
  };

  return (
    <div className="flex flex-col gap-4 bg-white rounded-lg p-1.5 animate-[fade-slide_0.2s_ease]">
      {/* Title Header */}
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#eff6ff] flex items-center justify-center text-[#2563eb] shrink-0">
            <Box size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-[13px] font-bold text-[#1e293b] truncate m-0">
              {entity.name || "Không tên"}
            </h4>
            <span className="text-[9.5px] font-bold text-[#2563eb] bg-[#dbeafe] px-1.5 py-0.2 rounded uppercase tracking-wider w-max leading-tight mt-0.5">
              {entity.renderType}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#f1f5f9] text-[#64748b] text-[11px] cursor-pointer font-bold shrink-0"
        >
          Đóng
        </button>
      </div>

      {/* Info Grid */}
      <div className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3">
          <div className="flex flex-col min-w-0">
            <span className={labelClasses}>Thuộc lớp</span>
            <span className="text-[12px] font-semibold text-[#1e293b] truncate">
              {entity.layer?.name || "N/A"}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <span className={labelClasses}>Độ mờ</span>
            <span className={valueClasses}>
              {Math.round((entity.opacity ?? 1) * 100)}%
            </span>
          </div>

          <div className="flex flex-col min-w-0 col-span-2">
            <span className={labelClasses}>Model URL</span>
            <span
              className={valueClasses + " text-[10.5px] cursor-help"}
              title={entity.assetUrl || entity.modelUrl || "Không có"}
            >
              {entity.assetUrl || entity.modelUrl || "Mặc định (theo Layer)"}
            </span>
          </div>
        </div>

        {/* GPS Coordinates */}
        {center && (
          <div className="flex flex-col gap-1.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1d4ed8] uppercase tracking-wider flex items-center gap-1">
                <Compass size={11} /> Vị trí địa lý
              </span>
              <button
                onClick={handleGoTo}
                className="inline-flex items-center gap-1 bg-[#2563eb] text-white text-[10px] font-bold py-1 px-2.5 rounded hover:bg-[#1d4ed8] cursor-pointer"
              >
                <Crosshair size={11} /> Bay tới
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 mt-1 text-xs">
              <div className="flex justify-between border-b border-[#dbeafe] pb-1">
                <span className="text-[#3b82f6] font-medium">Kinh độ X:</span>
                <span className="font-semibold font-mono">{fmtCoord(center.lng)}</span>
              </div>
              <div className="flex justify-between border-b border-[#dbeafe] pb-1">
                <span className="text-[#3b82f6] font-medium">Vĩ độ Y:</span>
                <span className="font-semibold font-mono">{fmtCoord(center.lat)}</span>
              </div>
              <div className="flex justify-between col-span-2 pt-1.5">
                <span className="text-[#3b82f6] font-medium">Cao độ Z:</span>
                <span className="font-semibold font-mono">{entity.elevation ?? 0} m</span>
              </div>
            </div>
          </div>
        )}

        {/* Transform Properties */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
            <Info size={11} /> Thuộc tính 3D
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div className="flex flex-col">
              <span className={labelClasses}>Tỉ lệ (Scale X/Y/Z):</span>
              <span className="font-mono font-semibold text-[#1e293b] mt-0.5">
                {entity.scaleX ?? entity.scale ?? 1} / {entity.scaleY ?? entity.scale ?? 1} / {entity.scaleZ ?? entity.scale ?? 1}
              </span>
            </div>
            <div className="flex flex-col">
              <span className={labelClasses}>Góc xoay (Rotation X/Y/Z):</span>
              <span className="font-mono font-semibold text-[#1e293b] mt-0.5">
                {entity.rotationX ?? 0}° / {entity.rotationY ?? 0}° / {entity.rotationZ ?? 0}°
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 border-t border-[#f1f5f9] pt-3 mt-1">
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 text-[12.5px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer transition-all bg-white text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] active:scale-[0.97]"
        >
          <Edit2 size={13} /> Chỉnh sửa
        </button>
        <button
          onClick={onDelete}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3.5 text-[12.5px] font-semibold border border-transparent rounded-lg cursor-pointer transition-all bg-[#fee2e2] text-[#ef4444] hover:bg-[#fecaca] active:scale-[0.97]"
        >
          <Trash2 size={13} /> Xóa đối tượng
        </button>
      </div>
    </div>
  );
};
