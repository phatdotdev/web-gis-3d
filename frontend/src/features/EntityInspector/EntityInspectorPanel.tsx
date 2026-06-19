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
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectInspectedEntity,
  setInspectedEntity,
  goToEntity,
  updateEntity,
} from "../../store/mapSlice";
import type { BackendSpatialEntity } from "../../types/backend";
import { fmtCoord, getEntityCenter } from "../../utils/geometry";
import {
  backendHost,
  uploadEntityImage,
  removeEntityImage,
  updateScene,
} from "../../utils/backendApi";

type TabId = "info" | "edit";

const labelClasses = "text-[11px] font-semibold text-[#64748b]";
const valueClasses = "text-[12px] font-semibold text-[#1e293b] font-mono truncate";

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
            className="flex-1 py-1.5 px-2 border border-[#e2e8f0] rounded text-[11px] font-semibold text-[#475569] bg-[#f8fafc] focus:outline-none focus:border-[#3b82f6] min-w-0"
            placeholder="Key"
          />
          <input
            type="text"
            value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
            onChange={(e) => handleValueChange(key, e.target.value)}
            className="flex-[1.5] py-1.5 px-2 border border-[#e2e8f0] rounded text-[11px] font-mono text-[#1e293b] bg-white focus:outline-none focus:border-[#3b82f6] min-w-0"
            placeholder="Value"
          />
          <button
            type="button"
            onClick={() => handleDelete(key)}
            className="p-1 rounded hover:bg-[#fef2f2] hover:text-[#dc2626] text-[#94a3b8] cursor-pointer shrink-0 transition-colors"
            title="Xóa trường"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        className="inline-flex items-center justify-center gap-1 py-1.5 px-3 text-[11px] font-semibold text-[#3b82f6] bg-[#eff6ff] border border-dashed border-[#bfdbfe] rounded-lg cursor-pointer hover:bg-[#dbeafe] transition-colors"
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
      <div className="py-3 text-center text-[11px] text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
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
              className="relative group aspect-square rounded-lg overflow-hidden border border-[#e2e8f0] bg-[#f8fafc] cursor-pointer"
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
        <label className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-semibold text-[#3b82f6] bg-[#eff6ff] border border-dashed border-[#bfdbfe] rounded-lg cursor-pointer hover:bg-[#dbeafe] transition-colors relative">
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
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-[rgba(255,255,255,0.15)] text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.3)] transition-colors"
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

  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [editMetadata, setEditMetadata] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Reset tab and metadata when entity changes
  useEffect(() => {
    if (entity) {
      setActiveTab("info");
      setEditMetadata(entity.metadata ?? {});
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

  if (!entity) return null;

  const center = getEntityCenter(entity.geometry);
  const images = entity.images ?? [];

  return (
    <div
      className="fixed bottom-4 right-4 w-[420px] max-w-[calc(100vw-32px)] max-h-[70vh] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.05)] z-[900] flex flex-col overflow-hidden font-sans animate-[inspector-slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]"
      style={{ backdropFilter: "blur(10px)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] text-white shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.15)] flex items-center justify-center shrink-0">
            <Box size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-[14px] font-bold truncate m-0 leading-tight">
              {entity.name || "Không tên"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-bold bg-[rgba(255,255,255,0.2)] px-1.5 py-0.5 rounded uppercase tracking-wider">
                {entity.renderType}
              </span>
              {entity.layer?.name && (
                <span className="text-[9px] font-medium text-[rgba(255,255,255,0.7)] truncate">
                  {entity.layer.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {center && (
            <button
              onClick={handleGoTo}
              className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] text-white flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.25)] transition-all"
              title="Bay tới"
            >
              <Crosshair size={13} />
            </button>
          )}
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] text-white flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.25)] transition-all"
            title="Đóng"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] bg-[#f8fafc] px-2 pt-1 shrink-0 gap-1">
        <button
          className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-t-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border-b-2 ${
            activeTab === "info"
              ? "bg-white text-[#2563eb] border-[#2563eb] shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
              : "text-[#64748b] border-transparent hover:text-[#1e293b] hover:bg-[#f1f5f9]"
          }`}
          onClick={() => setActiveTab("info")}
        >
          <Info size={13} />
          Thông tin
        </button>
        <button
          className={`flex-1 py-2 px-3 text-[12px] font-semibold rounded-t-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all border-b-2 ${
            activeTab === "edit"
              ? "bg-white text-[#2563eb] border-[#2563eb] shadow-[0_-1px_3px_rgba(0,0,0,0.03)]"
              : "text-[#64748b] border-transparent hover:text-[#1e293b] hover:bg-[#f1f5f9]"
          }`}
          onClick={() => setActiveTab("edit")}
        >
          <Edit2 size={13} />
          Chỉnh sửa
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 [&::-webkit-scrollbar]:w-[4px] [&::-webkit-scrollbar-thumb]:bg-[rgba(0,0,0,0.1)] [&::-webkit-scrollbar-thumb]:rounded">
        {activeTab === "info" && (
          <>
            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
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
                <span className="text-[12px] font-semibold text-[#1e293b] truncate">
                  {entity.layer?.name || "Độc lập"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className={labelClasses}>Thuộc Scene</span>
                <span className="text-[12px] font-semibold text-[#1e293b] truncate">
                  {entity.scene?.name || "Không"}
                </span>
              </div>
            </div>

            {/* Coordinates */}
            {center && (
              <div className="flex flex-col gap-1.5 bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-3">
                <span className="text-[10px] font-bold text-[#1d4ed8] uppercase tracking-wider flex items-center gap-1">
                  <Compass size={11} /> Vị trí địa lý
                </span>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div className="flex flex-col">
                    <span className="text-[#3b82f6] font-medium">Kinh độ</span>
                    <span className="font-mono font-semibold text-[#1e293b]">
                      {fmtCoord(center.lng)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#3b82f6] font-medium">Vĩ độ</span>
                    <span className="font-mono font-semibold text-[#1e293b]">
                      {fmtCoord(center.lat)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[#3b82f6] font-medium">Cao độ</span>
                    <span className="font-mono font-semibold text-[#1e293b]">
                      {entity.elevation ?? 0} m
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3D Transform */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                Thuộc tính 3D
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                <div className="flex flex-col">
                  <span className={labelClasses}>Scale (X/Y/Z)</span>
                  <span className="font-mono font-semibold text-[#1e293b]">
                    {entity.scaleX ?? entity.scale ?? 1} / {entity.scaleY ?? entity.scale ?? 1} / {entity.scaleZ ?? entity.scale ?? 1}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className={labelClasses}>Rotation (X/Y/Z)</span>
                  <span className="font-mono font-semibold text-[#1e293b]">
                    {entity.rotationX ?? 0}° / {entity.rotationY ?? 0}° / {entity.rotationZ ?? 0}°
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Read-only */}
            {entity.metadata && Object.keys(entity.metadata).length > 0 && (
              <div className="bg-[#fefce8] border border-[#fde68a] rounded-xl p-3 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[#92400e] uppercase tracking-wider flex items-center gap-1">
                  <Info size={11} /> Metadata
                </span>
                <div className="flex flex-col gap-1 max-h-[150px] overflow-y-auto">
                  {Object.entries(entity.metadata).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between text-[11px] border-b border-[#fef3c7] last:border-0 pb-1"
                    >
                      <span className="font-semibold text-[#78716c] truncate pr-2 w-[40%]">
                        {k}
                      </span>
                      <span className="text-[#1e293b] font-mono truncate w-[60%] text-right">
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
                <span className="text-[10px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
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
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
                <Edit2 size={11} /> Chỉnh sửa Metadata
              </span>
              <MetadataEditor
                metadata={editMetadata}
                onChange={setEditMetadata}
              />
            </div>

            {/* Image Gallery Editable */}
            {entity.type !== "scene_node" && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#e2e8f0]">
                <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1">
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
            <div className="pt-2 border-t border-[#e2e8f0]">
              <button
                onClick={() => void handleSaveMetadata()}
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-[13px] font-semibold border border-transparent rounded-xl cursor-pointer transition-all bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
  );
};
