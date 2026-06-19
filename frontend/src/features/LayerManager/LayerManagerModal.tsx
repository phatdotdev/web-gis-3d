import React, { useState } from "react";
import { Database, X, Plus, RefreshCw } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectLayers, selectLayerStatus, loadLayers } from "../../store/mapSlice";
import { LayerList } from "./LayerList";
import { LayerForm } from "./LayerForm";
import { EntityListModal } from "./EntityListModal";
import type { BackendLayer } from "../../types/backend";
import { cn } from "../../utils/cn";

type ModalView = "list" | "create" | "edit" | "entities";

type Props = {
  onClose: () => void;
};

export const LayerManagerModal: React.FC<Props> = ({ onClose }) => {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(selectLayers);
  const layerStatus = useAppSelector(selectLayerStatus);

  const [modalView, setModalView] = useState<ModalView>("list");
  const [selectedLayer, setSelectedLayer] = useState<BackendLayer | null>(null);

  const handleViewEntities = (layer: BackendLayer) => {
    setSelectedLayer(layer);
    setModalView("entities");
  };

  const handleEditLayer = (layer: BackendLayer) => {
    setSelectedLayer(layer);
    setModalView("edit");
  };

  const handleBackToList = () => {
    setSelectedLayer(null);
    setModalView("list");
  };

  const handleRefresh = () => {
    void dispatch(loadLayers());
  };

  const headerTitle = {
    list: "Quản lý Dữ liệu 3D",
    create: "Thêm Layer mới",
    edit: `Chỉnh sửa: ${selectedLayer?.name ?? ""}`,
    entities: `Thực thể: ${selectedLayer?.name ?? ""}`,
  }[modalView];

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px] z-[999] animate-[backdrop-fade_0.2s_ease]"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] max-w-[92vw] h-[700px] max-h-[88vh] bg-white rounded-xl shadow-[0_24px_48px_rgba(0,0,0,0.16),0_0_0_1px_rgba(0,0,0,0.04)] flex flex-col z-[1000] font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] overflow-hidden animate-[modal-enter_0.25s_cubic-bezier(0.34,1.56,0.64,1)]">
        <div className="flex justify-between items-center py-4 px-[22px] bg-gradient-to-br from-[#0f4c81] via-[#1a6fb5] to-[#2196f3]">
          <div className="flex items-center gap-2.5 text-white">
            <Database size={20} />
            <h2 className="text-[17px] font-bold text-white m-0 tracking-[0.3px]">
              {headerTitle}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {modalView !== "list" && (
              <button
                className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center h-8 px-3 rounded-lg text-xs font-semibold transition-all duration-200 hover:bg-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.3)]"
                onClick={handleBackToList}
              >
                ← Quay lại
              </button>
            )}
            {modalView === "list" && (
              <button
                className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 hover:bg-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.3)]"
                onClick={handleRefresh}
                title="Làm mới"
              >
                <RefreshCw
                  size={14}
                  className={cn(layerStatus === "loading" && "animate-spin")}
                />
              </button>
            )}
            <button
              className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-[rgba(255,255,255,0.25)] hover:border-[rgba(255,255,255,0.3)]"
              onClick={onClose}
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="py-[18px] px-[22px] overflow-y-auto flex-1 flex flex-col gap-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.1)] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(0,0,0,0.2)]">
          {modalView === "list" && (
            <>
              <button
                className="w-full py-3 px-4 rounded-[10px] border border-dashed border-[#c8d5e2] bg-[#f8fafc] text-[#334155] font-semibold text-[13px] cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[#eef2f7] hover:border-[#93c5fd]"
                onClick={() => setModalView("create")}
              >
                <Plus size={16} />
                Thêm Layer mới
              </button>
              <LayerList
                layers={layers}
                onViewEntities={handleViewEntities}
                onEditLayer={handleEditLayer}
              />
            </>
          )}

          {modalView === "create" && (
            <LayerForm onClose={handleBackToList} />
          )}

          {modalView === "edit" && selectedLayer && (
            <LayerForm layer={selectedLayer} onClose={handleBackToList} />
          )}

          {modalView === "entities" && selectedLayer && (
            <EntityListModal layer={selectedLayer} />
          )}
        </div>
      </div>
    </>
  );
};

export default LayerManagerModal;
