import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Crosshair,
  Box,
  Compass,
  Info,
  Edit2,
  Plus,
  Trash2,
  Save,
  ImagePlus,
  Loader2,
  Image,
  Boxes,
  Layers3,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectInspectedEntity,
  setInspectedEntity,
  goToEntity,
  updateEntity,
  selectSceneInteraction,
  setSceneLodLevel,
} from "../../store/mapSlice";
import type { BackendSpatialEntity, SceneLodLevel } from "../../types/backend";
import { fmtCoord, getEntityCenter } from "../../utils/geometry";
import {
  backendHost,
  uploadEntityImage,
  removeEntityImage,
  updateScene,
} from "../../utils/backendApi";

type TabId = "info" | "edit";

const labelClasses = "text-[11px] font-semibold text-calcite-text-3";
const valueClasses = "text-[12px] font-semibold text-calcite-text-1 font-mono truncate";

const sceneLodOptions: Array<{
  level: SceneLodLevel;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { level: 0, label: "LOD0", description: "Model gốc", icon: Box },
  { level: 1, label: "LOD1", description: "Thành phần", icon: Boxes },
  { level: 2, label: "LOD2", description: "Chi tiết", icon: Layers3 },
];

const resolveImageUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

// --- Metadata Editor Sub-component ---
const MetadataEditor: React.FC<{
  metadata: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
}> = ({ metadata, onChange }) => {
  const entries = Object.entries(metadata);

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (newKey === oldKey) return;
    const updated: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(metadata)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    onChange(updated);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...metadata, [key]: value });
  };

  const handleDelete = (key: string) => {
    const updated = { ...metadata };
    delete updated[key];
    onChange(updated);
  };

  const handleAdd = () => {
    let newKey = "new_field";
    let counter = 1;
    while (metadata[newKey] !== undefined) {
      newKey = `new_field_${counter}`;
      counter++;
    }
    onChange({ ...metadata, [newKey]: "" });
  };

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([key, value], index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            type="text"
            value={key}
            onChange={(e) => handleKeyChange(key, e.target.value)}
            className="flex-1 py-1.5 px-2 border border-calcite-border-2 rounded-sm text-[11px] font-semibold text-calcite-text-2 bg-calcite-bg-3 focus:outline-none focus:border-calcite-brand min-w-0"
            placeholder="Key"
          />
          <input
            type="text"
            value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="flex-[1.5] py-1.5 px-2 border border-calcite-border-2 rounded-sm text-[11px] font-mono text-calcite-text-1 bg-calcite-bg-2 focus:outline-none focus:border-calcite-brand min-w-0"
            placeholder="Value"
          />
          <button
            type="button"
            onClick={() => handleDelete(key)}
            className="p-1 rounded-sm hover:bg-red-50 hover:text-red-600 text-calcite-text-3 cursor-pointer shrink-0 transition-colors"
            title="Xóa trường"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center justify-center gap-1 py-1.5 px-3 text-[11px] font-semibold text-calcite-text-2 bg-calcite-bg-2 border border-dashed border-calcite-border-1 rounded-sm cursor-pointer hover:bg-calcite-bg-3 transition-colors"
      >
        <Plus size={12} />
        Thêm trường
      </button>
    </div>
  );
};

// --- Image Gallery Sub-component ---
const ImageGallery: React.FC<{
  images: string[];
  editable?: boolean;
  entityId: string;
  onUpdate: (entity: BackendSpatialEntity) => void;
}> = ({ images, editable = false, entityId, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadEntityImage(entityId, file);
      onUpdate(updated);
    } catch (err) {
      console.error("Failed to upload image:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async (imageUrl: string) => {
    const filename = imageUrl.split("/").pop();
    if (!filename) return;
    if (!window.confirm("Xóa ảnh này?")) return;
    try {
      const updated = await removeEntityImage(entityId, filename);
      onUpdate(updated);
    } catch (err) {
      console.error("Failed to remove image:", err);
    }
  };

  if (images.length === 0 && !editable) {
    return (
      <div className="py-3 text-center text-[11px] text-calcite-text-3 bg-calcite-bg-3 rounded-sm border border-dashed border-calcite-border-2">
        Chưa có ảnh đính kèm
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-sm overflow-hidden border border-calcite-border-2 bg-calcite-bg-3 cursor-pointer"
              onClick={() => setPreviewUrl(resolveImageUrl(imageUrl))}
            >
              <img
                src={resolveImageUrl(imageUrl)}
                alt={`Ảnh ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              {editable && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(imageUrl);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 bg-[rgba(0,0,0,0.6)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-[rgba(220,38,38,0.8)]"
                  title="Xóa ảnh"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && (
        <label className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-semibold text-calcite-text-2 bg-calcite-bg-2 border border-dashed border-calcite-border-1 rounded-sm cursor-pointer hover:bg-calcite-bg-3 transition-colors relative">
          {uploading ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Đang tải lên...
            </>
          ) : (
            <>
              <ImagePlus size={13} />
              Upload ảnh mới
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={(e) => void handleUpload(e)}
            disabled={uploading}
          />
        </label>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,0.85)] flex items-center justify-center p-8 cursor-pointer animate-[fade-in_0.15s_ease]"
          onClick={() => setPreviewUrl(null)}
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-sm shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-[rgba(255,255,255,0.15)] text-white rounded-sm flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.3)] transition-colors"
            onClick={() => setPreviewUrl(null)}
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

// --- Main Panel ---
export const EntityInspectorPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const entity = useAppSelector(selectInspectedEntity);
  const sceneInteraction = useAppSelector(selectSceneInteraction);

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [editMetadata, setEditMetadata] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [showImagesOnly, setShowImagesOnly] = useState(false);
  const [isDetailedOpen, setIsDetailedOpen] = useState(false);

  // Reset tab and states when entity changes
  useEffect(() => {
    if (entity) {
      setActiveTab("info");
      setEditMetadata(entity.metadata ?? {});
      setShowImagesOnly(false);
      setIsDetailedOpen(false);
    }
  }, [entity?.id]);

  const handleClose = useCallback(() => {
    dispatch(setInspectedEntity(null));
  }, [dispatch]);

  const handleGoTo = useCallback(() => {
    if (entity) dispatch(goToEntity(entity));
  }, [entity, dispatch]);

  const handleSaveMetadata = useCallback(async () => {
    if (!entity) return;
    setSaving(true);
    try {
      if (entity.type === "scene_node") {
        await updateScene(entity.id, { metadata: editMetadata });
        window.dispatchEvent(new Event("scene3d:reload"));
      } else {
        await dispatch(
          updateEntity({
            entityId: entity.id,
            payload: { metadata: editMetadata },
          }),
        ).unwrap();
      }
      // Update the inspected entity with new metadata
      dispatch(setInspectedEntity({ ...entity, metadata: editMetadata }));
    } catch (err) {
      console.error("Failed to save metadata:", err);
    } finally {
      setSaving(false);
    }
  }, [entity, editMetadata, dispatch]);

  const handleImageUpdate = useCallback(
    (updatedEntity: BackendSpatialEntity) => {
      dispatch(setInspectedEntity(updatedEntity));
    },
    [dispatch],
  );

  const handleSceneLodChange = useCallback(
    (sceneId: string, lodLevel: SceneLodLevel) => {
      if (!entity) return;
      dispatch(setSceneLodLevel({ sceneId, lodLevel }));
      dispatch(
        setInspectedEntity({
          ...entity,
          metadata: {
            ...(entity.metadata ?? {}),
            activeLodLevel: lodLevel,
            rootSceneId: sceneId,
          },
        }),
      );
    },
    [entity, dispatch],
  );

  if (!entity) return null;

  const center = getEntityCenter(entity.geometry);
  const images = entity.images ?? [];
  const isSceneNode = entity.type === "scene_node";
  const sceneRootId = String(entity.metadata?.rootSceneId ?? entity.sceneId ?? entity.id);
  const sceneLodLevel = Number(entity.metadata?.lodLevel ?? 0);
  const sceneActiveLodLevel = sceneInteraction.activeLodLevelsBySceneId[sceneRootId] ?? Number(entity.metadata?.activeLodLevel ?? sceneLodLevel);
  const sceneBreadcrumb = String(entity.metadata?.breadcrumb ?? entity.name ?? "");
  const sceneChildCount = Number(entity.metadata?.childCount ?? entity.scene?.children?.length ?? 0);
  const sceneParentName =
    typeof entity.metadata?.parentSceneName === "string"
      ? entity.metadata.parentSceneName
      : entity.scene?.parent?.name ?? null;

  return (
    <>
      {/* 1. Popup Mini (Compact Card) - Esri ArcGIS Style */}
      <div
        className="fixed bottom-4 right-4 w-[340px] max-w-[calc(100vw-32px)] bg-calcite-bg-2 rounded-sm shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-calcite-border-1 z-[900] flex flex-col overflow-hidden font-sans"
      >
        {/* Mini Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-calcite-border-2 bg-calcite-bg-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-sm bg-calcite-bg-3 flex items-center justify-center shrink-0">
              <Box size={13} className="text-calcite-brand" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-[13px] font-bold text-calcite-text-1 truncate m-0 leading-tight">
                {entity.name || "Không tên"}
              </h3>
              <span className="text-[9px] font-semibold text-calcite-text-3 uppercase tracking-wider mt-0.5">
                {entity.renderType}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-sm text-calcite-text-3 flex items-center justify-center cursor-pointer hover:bg-calcite-bg-3 hover:text-calcite-text-1 transition-colors"
            title="Đóng"
          >
            <X size={14} />
          </button>
        </div>

        {/* Mini Actions Row */}
        <div className="grid grid-cols-3 gap-2 p-2.5 bg-calcite-bg-1 border-b border-calcite-border-2 shrink-0">
          <button
            onClick={handleGoTo}
            disabled={!center}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold text-calcite-text-2 bg-calcite-bg-2 border border-calcite-border-2 rounded-sm hover:text-calcite-brand hover:border-calcite-brand hover:bg-calcite-bg-3 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Bay tới đối tượng"
          >
            <Crosshair size={13} className="text-calcite-text-2" />
            <span>Phóng tới</span>
          </button>
          <button
            onClick={() => setShowImagesOnly(!showImagesOnly)}
            disabled={entity.type === "scene_node"}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold border rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${showImagesOnly
                ? "bg-calcite-bg-3 text-calcite-brand border-calcite-brand"
                : "bg-calcite-bg-2 text-calcite-text-2 border-calcite-border-2 hover:text-calcite-brand hover:border-calcite-brand hover:bg-calcite-bg-3"
              }`}
            title="Xem ảnh đính kèm"
          >
            <Image size={13} />
            <span>Xem ảnh</span>
          </button>
          <button
            onClick={() => setIsDetailedOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2 px-1 text-[11px] font-semibold text-calcite-text-2 bg-calcite-bg-2 border border-calcite-border-2 rounded-sm hover:text-calcite-brand hover:border-calcite-brand hover:bg-calcite-bg-3 transition-all cursor-pointer shadow-sm"
            title="Xem chi tiết"
          >
            <Info size={13} className="text-calcite-text-2" />
            <span>Chi tiết</span>
          </button>
        </div>

        {isSceneNode && (
          <div className="p-2.5 bg-calcite-bg-2 border-b border-calcite-border-2 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-calcite-text-3 uppercase tracking-wider">
                Level of detail
              </span>
              <span className="text-[10px] font-bold text-calcite-brand bg-calcite-bg-3 px-1.5 py-0.5 rounded-sm">
                LOD{sceneActiveLodLevel}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sceneLodOptions.map((option) => {
                const Icon = option.icon;
                const active = sceneActiveLodLevel === option.level;
                return (
                  <button
                    key={option.level}
                    type="button"
                    onClick={() => handleSceneLodChange(sceneRootId, option.level)}
                    className={`h-[50px] inline-flex flex-col items-center justify-center gap-0.5 rounded-sm border px-1 text-[10px] font-semibold cursor-pointer transition-all ${
                      active
                        ? "bg-calcite-bg-3 text-calcite-brand border-calcite-brand"
                        : "bg-calcite-bg-1 text-calcite-text-2 border-calcite-border-2 hover:text-calcite-brand hover:border-calcite-brand"
                    }`}
                    title={`${option.label} - ${option.description}`}
                  >
                    <Icon size={13} />
                    <span>{option.label}</span>
                    <span className="text-[8.5px] font-medium opacity-80 truncate max-w-full">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mini Images Content Area */}
        {showImagesOnly && entity.type !== "scene_node" && (
          <div className="p-3 max-h-[220px] overflow-y-auto bg-calcite-bg-2 border-t border-transparent">
            <span className="text-[10px] font-bold text-calcite-text-3 uppercase tracking-wider block mb-2">
              Ảnh đính kèm ({images.length})
            </span>
            <ImageGallery
              images={images}
              entityId={entity.id}
              onUpdate={handleImageUpdate}
            />
          </div>
        )}
      </div>

      {/* 2. Detailed Modal - Esri ArcGIS Style */}
      {isDetailedOpen && (
        <div className="fixed inset-0 bg-black/45 z-[950] flex items-center justify-center p-4">
          <div
            className="bg-calcite-bg-2 rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-calcite-border-1 w-[460px] max-w-full max-h-[85vh] flex flex-col overflow-hidden font-sans animate-[form-slide-in_0.2s_ease]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-calcite-bg-2 border-b border-calcite-border-2 text-calcite-text-1 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-sm bg-calcite-bg-3 flex items-center justify-center shrink-0">
                  <Box size={14} className="text-calcite-brand" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h3 className="text-[14px] font-bold text-calcite-text-1 truncate m-0 leading-tight">
                    {entity.name || "Không tên"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold bg-calcite-bg-3 text-calcite-brand px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                      {entity.renderType}
                    </span>
                    {entity.layer?.name && (
                      <span className="text-[9px] font-medium text-calcite-text-2 truncate">
                        Lớp: {entity.layer.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsDetailedOpen(false)}
                className="w-7 h-7 rounded-sm text-calcite-text-3 flex items-center justify-center cursor-pointer hover:bg-calcite-bg-3 hover:text-calcite-text-1 transition-colors"
                title="Đóng chi tiết"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-calcite-border-2 bg-calcite-bg-1 px-2 pt-1 shrink-0 gap-1">
              <button
                className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-t-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all border-b-2 ${activeTab === "info"
                    ? "bg-calcite-bg-2 text-calcite-brand border-calcite-brand shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
                    : "text-calcite-text-3 border-transparent hover:text-calcite-text-1 hover:bg-calcite-bg-3"
                  }`}
                onClick={() => setActiveTab("info")}
              >
                <Info size={13} />
                Thông tin
              </button>
              <button
                className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-t-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all border-b-2 ${activeTab === "edit"
                    ? "bg-calcite-bg-2 text-calcite-brand border-calcite-brand shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
                    : "text-calcite-text-3 border-transparent hover:text-calcite-text-1 hover:bg-calcite-bg-3"
                  }`}
                onClick={() => setActiveTab("edit")}
              >
                <Edit2 size={13} />
                Chỉnh sửa
              </button>
            </div>

            {/* Modal Body Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.15)] [&::-webkit-scrollbar-thumb]:rounded-sm">
              {activeTab === "info" && (
                <>
                  {isSceneNode && (
                    <div className="bg-calcite-bg-3 border border-calcite-border-2 rounded-sm p-3 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-calcite-brand uppercase tracking-wider flex items-center gap-1">
                        <Box size={11} /> Scene LOD
                      </span>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                        <div className="flex flex-col min-w-0">
                          <span className={labelClasses}>Dang chon</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            LOD{sceneActiveLodLevel}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={labelClasses}>Node LOD</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            LOD{sceneLodLevel}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0 col-span-2">
                          <span className={labelClasses}>Breadcrumb</span>
                          <span className="text-[12px] font-semibold text-calcite-text-1 truncate">
                            {sceneBreadcrumb}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={labelClasses}>Scene cha</span>
                          <span className="text-[12px] font-semibold text-calcite-text-1 truncate">
                            {sceneParentName || "Root"}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={labelClasses}>Node con</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            {sceneChildCount}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0 col-span-2">
                          <span className={labelClasses}>Model URL</span>
                          <span className="text-[11px] font-mono text-calcite-text-1 truncate">
                            {entity.modelUrl || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-calcite-bg-3 border border-calcite-border-2 rounded-sm p-3">
                    <div className="flex flex-col min-w-0">
                      <span className={labelClasses}>Loại hình</span>
                      <span className={valueClasses}>{entity.type}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={labelClasses}>Độ mờ</span>
                      <span className={valueClasses}>
                        {Math.round((entity.opacity ?? 1) * 100)}%
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={labelClasses}>Thuộc Layer</span>
                      <span className="text-[12px] font-semibold text-calcite-text-1 truncate">
                        {entity.layer?.name || "Độc lập"}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={labelClasses}>Thuộc Scene</span>
                      <span className="text-[12px] font-semibold text-calcite-text-1 truncate">
                        {entity.scene?.name || "Không"}
                      </span>
                    </div>
                  </div>

                  {/* Coordinates */}
                  {center && (
                    <div className="flex flex-col gap-1.5 bg-calcite-bg-3 border border-calcite-border-2 rounded-sm p-3 text-calcite-text-1">
                      <span className="text-[10px] font-bold text-calcite-brand uppercase tracking-wider flex items-center gap-1">
                        <Compass size={11} /> Vị trí địa lý
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div className="flex flex-col">
                          <span className="text-calcite-text-3 font-medium">Kinh độ</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            {fmtCoord(center.lng)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-calcite-text-3 font-medium">Vĩ độ</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            {fmtCoord(center.lat)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-calcite-text-3 font-medium">Cao độ</span>
                          <span className="font-mono font-semibold text-calcite-text-1">
                            {entity.elevation ?? 0} m
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3D Transform */}
                  <div className="bg-calcite-bg-3 border border-calcite-border-2 rounded-sm p-3 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-calcite-text-2 uppercase tracking-wider">
                      Thuộc tính 3D
                    </span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                      <div className="flex flex-col">
                        <span className={labelClasses}>Scale (X/Y/Z)</span>
                        <span className="font-mono font-semibold text-calcite-text-1">
                          {entity.scaleX ?? entity.scale ?? 1} / {entity.scaleY ?? entity.scale ?? 1} / {entity.scaleZ ?? entity.scale ?? 1}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className={labelClasses}>Rotation (X/Y/Z)</span>
                        <span className="font-mono font-semibold text-calcite-text-1">
                          {entity.rotationX ?? 0}° / {entity.rotationY ?? 0}° / {entity.rotationZ ?? 0}°
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Read-only */}
                  {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                    <div className="bg-calcite-bg-3 border border-calcite-border-2 rounded-sm p-3 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-calcite-brand uppercase tracking-wider flex items-center gap-1">
                        <Info size={11} /> Metadata
                      </span>
                      <div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto">
                        {Object.entries(entity.metadata).map(([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between text-[11px] border-b border-calcite-border-2 last:border-0 pb-1"
                          >
                            <span className="font-semibold text-calcite-text-2 truncate pr-2 w-[40%]">
                              {k}
                            </span>
                            <span className="text-calcite-text-1 font-mono truncate w-[60%] text-right">
                              {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images Read-only */}
                  {entity.type !== "scene_node" && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-calcite-text-2 uppercase tracking-wider flex items-center gap-1">
                        <ImagePlus size={11} /> Ảnh đính kèm ({images.length})
                      </span>
                      <ImageGallery
                        images={images}
                        entityId={entity.id}
                        onUpdate={handleImageUpdate}
                      />
                    </div>
                  )}
                </>
              )}

              {activeTab === "edit" && (
                <>
                  {/* Metadata Editor */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-calcite-text-2 uppercase tracking-wider flex items-center gap-1">
                      <Edit2 size={11} /> Chỉnh sửa Metadata
                    </span>
                    <MetadataEditor
                      metadata={editMetadata}
                      onChange={setEditMetadata}
                    />
                  </div>

                  {/* Image Gallery Editable */}
                  {entity.type !== "scene_node" && (
                    <div className="flex flex-col gap-2 pt-3.5 border-t border-calcite-border-2">
                      <span className="text-[11px] font-bold text-calcite-text-2 uppercase tracking-wider flex items-center gap-1">
                        <ImagePlus size={11} /> Quản lý ảnh
                      </span>
                      <ImageGallery
                        images={images}
                        editable
                        entityId={entity.id}
                        onUpdate={handleImageUpdate}
                      />
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="pt-3.5 border-t border-calcite-border-2 mt-auto">
                    <button
                      onClick={() => void handleSaveMetadata()}
                      disabled={saving}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 text-[12.5px] font-semibold border border-transparent rounded-sm cursor-pointer transition-all bg-calcite-brand text-white hover:bg-calcite-brand-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Lưu thay đổi Metadata
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
