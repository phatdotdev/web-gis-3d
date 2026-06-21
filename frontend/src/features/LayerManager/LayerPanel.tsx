import React, { useState } from "react";
import {
  Layers,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  Edit2,
  Trash2,
  Crosshair,
  Info,
  Loader2,
  Box,
  Compass,
  RefreshCw,
  Building2,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectLayers,
  selectLayerStatus,
  loadLayers,
  deleteLayer,
  toggleLayerSelection,
  selectSelectedLayerIds,
  selectLayerPanelOpen,
  setLayerPanelOpen,
  goToEntity,
  deleteEntity,
} from "../../store/mapSlice";
import type { BackendLayer, BackendSpatialEntity } from "../../types/backend";
import { backendHost } from "../../utils/backendApi";
import { LayerForm } from "./LayerForm";
import { EntityEditForm } from "./EntityEditForm";
import { FeaturePanel } from "../FeatureManager/FeaturePanel";
import { ModelPanel } from "../ModelManager/ModelPanel";
import { ScenePanel } from "../SceneManager/ScenePanel";
import { fmtCoord, getEntityCenter } from "../../utils/geometry";
import { cn } from "../../utils/cn";

type ActiveTab = "layers" | "features" | "models" | "scenes";
type PanelView = "list" | "create" | "edit";

export const LayerPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(selectLayers);
  const layerStatus = useAppSelector(selectLayerStatus);
  const selectedLayerIds = useAppSelector(selectSelectedLayerIds);
  const isPanelOpen = useAppSelector(selectLayerPanelOpen);

  const [activeTab, setActiveTab] = useState<ActiveTab>("layers");
  const [panelView, setPanelView] = useState<PanelView>("list");
  const [editingLayer, setEditingLayer] = useState<BackendLayer | null>(null);

  // States for tree-view entities
  const [expandedLayers, setExpandedLayers] = useState<string[]>([]);
  const [loadedEntities, setLoadedEntities] = useState<Record<string, BackendSpatialEntity[]>>({});
  const [loadingEntities, setLoadingEntities] = useState<Record<string, boolean>>({});
  const [expandedMetadata, setExpandedMetadata] = useState<string[]>([]);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);

  // Load entities for a specific layer when expanded
  const fetchEntitiesForLayer = async (layerId: string) => {
    if (loadedEntities[layerId] || loadingEntities[layerId]) return;

    setLoadingEntities((prev) => ({ ...prev, [layerId]: true }));
    try {
      const res = await fetch(`${backendHost}/api/spatial-entities?layerId=${layerId}`);
      if (!res.ok) throw new Error("Failed to load entities");
      const data = await res.json();
      setLoadedEntities((prev) => ({ ...prev, [layerId]: data }));
    } catch (err) {
      console.error(`Error loading entities for layer ${layerId}:`, err);
    } finally {
      setLoadingEntities((prev) => ({ ...prev, [layerId]: false }));
    }
  };

  const handleToggleExpand = (layerId: string) => {
    const isExpanded = expandedLayers.includes(layerId);
    if (isExpanded) {
      setExpandedLayers((prev) => prev.filter((id) => id !== layerId));
    } else {
      setExpandedLayers((prev) => [...prev, layerId]);
      void fetchEntitiesForLayer(layerId);
    }
  };

  const handleToggleMetadata = (entityId: string) => {
    setExpandedMetadata((prev) =>
      prev.includes(entityId) ? prev.filter((id) => id !== entityId) : [...prev, entityId],
    );
  };

  const handleDeleteLayer = async (layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa layer này cùng toàn bộ thực thể của nó?")) {
      await dispatch(deleteLayer(layerId)).unwrap();
    }
  };

  const handleDeleteEntity = async (layerId: string, entityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn xóa đối tượng này?")) {
      await dispatch(deleteEntity(entityId)).unwrap();
      // Reload entities for that layer
      setLoadedEntities((prev) => {
        const next = { ...prev };
        if (next[layerId]) {
          next[layerId] = next[layerId].filter((ent) => ent.id !== entityId);
        }
        return next;
      });
    }
  };

  const handleRefresh = () => {
    void dispatch(loadLayers());
    // Invalidate cached entities to force reload on expand
    setLoadedEntities({});
  };

  const handleClose = () => {
    dispatch(setLayerPanelOpen(false));
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 h-screen w-[385px] max-w-[95vw] bg-[var(--color-panel-bg)] border-r border-[var(--color-panel-border)] shadow-[4px_0_24px_rgba(0,0,0,0.08)] z-[950] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] font-sans backdrop-blur-[10px]",
        isPanelOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-r from-[#0f4c81] via-[#1a6fb5] to-[#2196f3] text-white shrink-0 shadow-[0_2px_8px_rgba(15,76,129,0.15)]">
        <div className="flex items-center gap-2.5">
          <Layers size={19} className="text-white" />
          <h2 className="text-[16px] font-bold tracking-[0.3px] m-0 text-white select-none">
            {panelView === "list" && "Quản lý Lớp & Bản đồ"}
            {panelView === "create" && "Thêm Layer mới"}
            {panelView === "edit" && "Chỉnh sửa Layer"}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {panelView !== "list" && (
            <button
              className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center h-7 px-2.5 rounded-lg text-xs font-semibold transition-all hover:bg-[rgba(255,255,255,0.22)] active:scale-95"
              onClick={() => {
                setPanelView("list");
                setEditingLayer(null);
              }}
            >
              ← Quay lại
            </button>
          )}
          {panelView === "list" && (
            <button
              className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center h-7 w-7 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.22)] active:scale-95"
              onClick={handleRefresh}
              title="Làm mới"
            >
              <RefreshCw size={13} className={cn(layerStatus === "loading" && "animate-spin")} />
            </button>
          )}
          <button
            className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.22)] active:scale-95"
            onClick={handleClose}
            aria-label="Đóng panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      {panelView === "list" && (
        <div className="flex border-b border-[var(--color-panel-border)] bg-[var(--color-panel-surface)] p-1 shrink-0 gap-1">
          <button
            className={cn(
              "flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all",
              activeTab === "layers"
                ? "bg-white text-[var(--color-panel-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e2e8f0]"
                : "text-[var(--color-panel-muted)] hover:text-[var(--color-panel-text)] hover:bg-[#eff1f4]",
            )}
            onClick={() => setActiveTab("layers")}
          >
            <Layers size={13} />
            Lớp dữ liệu
          </button>
          <button
            className={cn(
              "flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all",
              activeTab === "features"
                ? "bg-white text-[var(--color-panel-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e2e8f0]"
                : "text-[var(--color-panel-muted)] hover:text-[var(--color-panel-text)] hover:bg-[#eff1f4]",
            )}
            onClick={() => setActiveTab("features")}
          >
            <Box size={13} />
            Features
          </button>
          <button
            className={cn(
              "flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all",
              activeTab === "models"
                ? "bg-white text-[var(--color-panel-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e2e8f0]"
                : "text-[var(--color-panel-muted)] hover:text-[var(--color-panel-text)] hover:bg-[#eff1f4]",
            )}
            onClick={() => setActiveTab("models")}
          >
            <Compass size={13} />
            Models
          </button>
          <button
            className={cn(
              "flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all",
              activeTab === "scenes"
                ? "bg-white text-[var(--color-panel-accent)] shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#e2e8f0]"
                : "text-[var(--color-panel-muted)] hover:text-[var(--color-panel-text)] hover:bg-[#eff1f4]",
            )}
            onClick={() => setActiveTab("scenes")}
          >
            <Building2 size={13} />
            Scenes
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.1)] [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.25)]">
        {panelView === "create" && (
          <LayerForm onClose={() => setPanelView("list")} />
        )}

        {panelView === "edit" && editingLayer && (
          <LayerForm layer={editingLayer} onClose={() => {
            setPanelView("list");
            setEditingLayer(null);
          }} />
        )}

        {panelView === "list" && activeTab === "layers" && (
          <div className="flex flex-col gap-3">
            {/* Create Layer CTA */}
            <button
              className="w-full py-2.5 px-4 rounded-lg border border-dashed border-[#c8d5e2] bg-[#f8fafc] text-[#334155] font-semibold text-[12.5px] cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-[#eef2f7] hover:border-[#93c5fd] active:scale-[0.98]"
              onClick={() => setPanelView("create")}
            >
              <Plus size={15} />
              Thêm Layer mới
            </button>

            {/* Tree View of Layers */}
            {layers.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
                Chưa có Layer nào. Hãy thêm Layer mới.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {layers.map((layer) => {
                  const resolvedIconUrl = layer.iconUrl
                    ? layer.iconUrl.startsWith("http")
                      ? layer.iconUrl
                      : `${backendHost}${layer.iconUrl.startsWith("/") ? "" : "/"}${layer.iconUrl}`
                    : undefined;

                  const isExpanded = expandedLayers.includes(layer.id);
                  const isChecked = selectedLayerIds.includes(layer.id);

                  return (
                    <div
                      key={layer.id}
                      className="border border-[#e2e8f0] rounded-lg bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-colors hover:border-[#cbd5e1]"
                    >
                      {/* Layer Item Header */}
                      <div className="flex items-center justify-between p-3 gap-2 border-b border-transparent bg-white hover:bg-[#fcfdfe]">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            className="p-1 rounded hover:bg-[#e2e8f0] text-[#64748b] cursor-pointer"
                            onClick={() => handleToggleExpand(layer.id)}
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>

                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer shrink-0"
                            checked={isChecked}
                            onChange={() => dispatch(toggleLayerSelection(layer.id))}
                            title="Hiển thị trên bản đồ"
                          />

                          {resolvedIconUrl ? (
                            <div className="w-8 h-8 rounded bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={resolvedIconUrl}
                                alt={layer.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center shrink-0">
                              <Layers size={14} className="text-[#3b82f6]" />
                            </div>
                          )}

                          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-[13px] font-semibold text-[#1e293b] truncate leading-tight">
                                {layer.name}
                              </span>
                              {layer.dataStatus === 'fallback' && (
                                <span
                                  className="text-[8px] font-bold text-[#d97706] bg-[#fef3c7] border border-[#fde68a] px-1 py-0.2 rounded uppercase shrink-0"
                                  title={layer.fallbackInfo?.reason ?? 'Fallback offline data'}
                                >
                                  Fallback
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-medium text-[#64748b]">
                                {layer.entities?.length || 0} features
                              </span>
                              <span className="text-[9px] font-bold text-[#1d4ed8] bg-[#dbeafe] px-1 rounded uppercase tracking-wide">
                                {layer.type}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Layer Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            className="p-1.5 rounded hover:bg-[#eff6ff] hover:text-[#2563eb] text-[#64748b] cursor-pointer transition-colors"
                            onClick={() => {
                              setEditingLayer(layer);
                              setPanelView("edit");
                            }}
                            title="Sửa Layer"
                          >
                            <Edit2 size={12.5} />
                          </button>
                          <button
                            className="p-1.5 rounded hover:bg-[#fef2f2] hover:text-[#dc2626] text-[#64748b] cursor-pointer transition-colors"
                            onClick={(e) => handleDeleteLayer(layer.id, e)}
                            title="Xóa Layer"
                          >
                            <Trash2 size={12.5} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Section (Tree Children) */}
                      {isExpanded && (
                        <div className="bg-[#f8fafc] border-t border-[#f1f5f9] p-2 flex flex-col gap-2">
                          {loadingEntities[layer.id] && (
                            <div className="py-4 flex items-center justify-center text-xs text-[#3b82f6] gap-1.5">
                              <Loader2 className="animate-spin" size={13} />
                              Đang tải features...
                            </div>
                          )}

                          {!loadingEntities[layer.id] && (!loadedEntities[layer.id] || loadedEntities[layer.id].length === 0) && (
                            <div className="py-3 text-center text-[11px] text-[#94a3b8]">
                              Không có feature nào trong layer này.
                            </div>
                          )}

                          {!loadingEntities[layer.id] && loadedEntities[layer.id] && loadedEntities[layer.id].map((entity) => {
                            const isEditingEntity = editingEntityId === entity.id;
                            const isMetaExpanded = expandedMetadata.includes(entity.id);
                            const center = getEntityCenter(entity.geometry);
                            const hasMetadata = entity.metadata && Object.keys(entity.metadata).length > 0;

                            const entityIconUrl = layer.iconUrl ?? entity.iconUrl ?? undefined;
                            const resolvedEntityIconUrl = entityIconUrl
                              ? entityIconUrl.startsWith("http")
                                ? entityIconUrl
                                : `${backendHost}${entityIconUrl.startsWith("/") ? "" : "/"}${entityIconUrl}`
                              : undefined;

                            return (
                              <div
                                key={entity.id}
                                className="border border-[#e2e8f0] rounded-md p-2 bg-white flex flex-col gap-1.5 transition-colors hover:border-[#cbd5e1]"
                              >
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {resolvedEntityIconUrl ? (
                                      <div className="w-6 h-6 rounded bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                          src={resolvedEntityIconUrl}
                                          alt={entity.name || entity.id}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded bg-[#f0fdf4] border border-[#dcfce7] flex items-center justify-center shrink-0">
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: entity.color || "#10b981" }}
                                        />
                                      </div>
                                    )}

                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                      <span className="text-[11.5px] font-semibold text-[#1e293b] truncate">
                                        {entity.name || `Feature_${entity.id.slice(0, 5)}`}
                                      </span>
                                      <span className="text-[9px] text-[#8c9ba5] font-bold uppercase">
                                        {entity.renderType}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-0.5">
                                    {center && (
                                      <button
                                        className="p-1 rounded hover:bg-[#eff6ff] hover:text-[#2563eb] text-[#64748b] cursor-pointer"
                                        onClick={() => dispatch(goToEntity(entity))}
                                        title="Bay tới feature"
                                      >
                                        <Crosshair size={11} />
                                      </button>
                                    )}
                                    {hasMetadata && (
                                      <button
                                        className="p-1 rounded hover:bg-[#f1f5f9] text-[#64748b] cursor-pointer"
                                        onClick={() => handleToggleMetadata(entity.id)}
                                        title="Xem Metadata"
                                      >
                                        <Info size={11} />
                                      </button>
                                    )}
                                    <button
                                      className="p-1 rounded hover:bg-[#eff6ff] hover:text-[#2563eb] text-[#64748b] cursor-pointer"
                                      onClick={() => setEditingEntityId(isEditingEntity ? null : entity.id)}
                                      title="Chỉnh sửa hiển thị"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      className="p-1 rounded hover:bg-[#fef2f2] hover:text-[#dc2626] text-[#64748b] cursor-pointer"
                                      onClick={(e) => handleDeleteEntity(layer.id, entity.id, e)}
                                      title="Xóa"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {/* Coordinate Info */}
                                {center && (
                                  <div className="text-[9.5px] font-mono text-[#4b5563] bg-[#f3f4f6] px-1.5 py-0.5 rounded flex justify-between">
                                    <span>Tọa độ:</span>
                                    <span>
                                      {fmtCoord(center.lat)}, {fmtCoord(center.lng)}
                                    </span>
                                  </div>
                                )}

                                {/* Metadata Dropdown */}
                                {isMetaExpanded && hasMetadata && entity.metadata && (
                                  <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded p-1.5 mt-1 text-[10px] animate-[fade-slide_0.2s_ease]">
                                    <div className="font-bold text-[#475569] mb-1 pb-1 border-b border-[#e2e8f0]">Metadata</div>
                                    <div className="max-h-[120px] overflow-y-auto flex flex-col gap-0.5">
                                      {Object.entries(entity.metadata).map(([k, v]) => (
                                        <div key={k} className="flex justify-between border-b border-[#f1f5f9] last:border-0 pb-0.5">
                                          <span className="font-semibold text-[#64748b] truncate pr-2 w-[40%]">{k}</span>
                                          <span className="text-[#1e293b] font-mono truncate w-[60%] text-right">
                                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Entity Edit Form Dropdown */}
                                {isEditingEntity && (
                                  <EntityEditForm
                                    entity={entity}
                                    onCancel={() => {
                                      setEditingEntityId(null);
                                      // Force reload entities of this layer to get updated values
                                      setLoadedEntities((prev) => {
                                        const next = { ...prev };
                                        delete next[layer.id];
                                        return next;
                                      });
                                      void fetchEntitiesForLayer(layer.id);
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {panelView === "list" && activeTab === "features" && (
          <FeaturePanel />
        )}

        {panelView === "list" && activeTab === "models" && (
          <>
            <ModelPanel />
          <div className="hidden py-6 px-4 bg-white border border-[#e2e8f0] rounded-xl text-center flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#f0fdf4] flex items-center justify-center text-[#15803d]">
              <Compass size={24} />
            </div>
            <h3 className="text-sm font-bold text-[#1e293b] m-0">Building Scene Layers</h3>
            <p className="text-xs text-[#64748b] leading-relaxed m-0">
              Công cụ quản lý mô hình tòa nhà phức tạp có phân cấp tầng, tường, cửa. Cho phép mặt cắt (Slice) và tắt/bật hiển thị cấu kiện bên trong.
            </p>
            <div className="text-[11px] font-bold text-[#15803d] bg-[#dcfce7] px-2 py-0.5 rounded-full mt-1">
              Phát triển ở Phase 4
            </div>
          </div>
          </>
        )}

        {panelView === "list" && activeTab === "scenes" && (
          <ScenePanel />
        )}
      </div>
    </div>
  );
};
