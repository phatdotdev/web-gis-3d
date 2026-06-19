import React from "react";
import { Layers, Eye, Edit2, Trash2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { deleteLayer, toggleLayerSelection, selectSelectedLayerIds } from "../../store/mapSlice";
import type { BackendLayer } from "../../types/backend";
import { backendHost } from "../../utils/backendApi";

type Props = {
  layers: BackendLayer[];
  onViewEntities: (layer: BackendLayer) => void;
  onEditLayer: (layer: BackendLayer) => void;
};

export const LayerList: React.FC<Props> = ({
  layers,
  onViewEntities,
  onEditLayer,
}) => {
  const dispatch = useAppDispatch();
  const selectedLayerIds = useAppSelector(selectSelectedLayerIds);

  const handleDeleteLayer = async (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dispatch(deleteLayer(layerId)).unwrap();
  };

  if (layers.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
        Chưa có Layer nào. Hãy thêm Layer mới.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {layers.map((layer) => {
        const resolvedIconUrl = layer.iconUrl
          ? layer.iconUrl.startsWith("http")
            ? layer.iconUrl
            : `${backendHost}${layer.iconUrl.startsWith("/") ? "" : "/"}${layer.iconUrl}`
          : undefined;

        return (
          <div
            key={layer.id}
            className="flex items-center justify-between gap-3 py-3 px-4 rounded-[10px] border border-[#e2e8f0] bg-white transition-all duration-200 hover:border-[#93c5fd] hover:shadow-[0_2px_8px_rgba(33,150,243,0.08)]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer shrink-0"
                checked={selectedLayerIds.includes(layer.id)}
                onChange={() => dispatch(toggleLayerSelection(layer.id))}
                title="Hiển thị trên bản đồ"
              />
              <div className="w-9 h-9 rounded-lg bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center shrink-0 overflow-hidden">
                {resolvedIconUrl ? (
                  <img
                    src={resolvedIconUrl}
                    alt={layer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Layers size={18} className="text-[#3b82f6]" />
                )}
              </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[13.5px] font-semibold text-[#1e293b] truncate">
                  {layer.name}
                </span>
                {layer.dataStatus === 'fallback' && (
                  <span
                    className="text-[9px] font-bold text-[#d97706] bg-[#fef3c7] border border-[#fde68a] px-1 py-0.5 rounded uppercase shrink-0"
                    title={layer.fallbackInfo?.reason ?? 'Đang sử dụng dữ liệu offline được lưu trữ gần nhất'}
                  >
                    Fallback
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[#64748b] bg-[#e2e8f0] px-2 py-0.5 rounded-[10px]">
                  {layer.entities?.length || 0} đối tượng
                </span>
                <span className="text-[10px] font-bold text-[#1d4ed8] bg-[#dbeafe] px-1.5 py-0.5 rounded uppercase tracking-wide">
                  {layer.type}
                </span>
              </div>
            </div>

          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#eff6ff] hover:text-[#2563eb] hover:border-[#93c5fd]"
              onClick={() => onViewEntities(layer)}
              title="Xem thực thể"
            >
              <Eye size={14} />
            </button>
            <button
              className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#eff6ff] hover:text-[#2563eb] hover:border-[#93c5fd]"
              onClick={() => onEditLayer(layer)}
              title="Chỉnh sửa layer"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="flex items-center justify-center w-[30px] h-[30px] border border-[#e2e8f0] rounded-[7px] bg-white cursor-pointer text-[#64748b] transition-all duration-150 hover:bg-[#fef2f2] hover:text-[#dc2626] hover:border-[#fca5a5]"
              onClick={(e) => handleDeleteLayer(layer.id, e)}
              title="Xóa layer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
};
