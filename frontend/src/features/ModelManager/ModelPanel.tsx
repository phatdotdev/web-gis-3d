import React, { useEffect, useState } from "react";
import { Box, Edit2, Loader2, Plus, RefreshCw, Save, Trash2, UploadCloud } from "lucide-react";

import type { BackendModel3D } from "../../types/backend";
import {
  createModel,
  deleteModel,
  fetchModels,
  replaceModelFile,
  updateModel,
  uploadModel,
} from "../../utils/backendApi";
import { backendHost } from "../../utils/backendApi";

type FormState = {
  name: string;
  description: string;
  category: string;
  assetUrl: string;
  sceneServiceUrl: string;
  sceneLayerType: "scene" | "building";
  publishStatus: "none" | "pending" | "published" | "failed";
};

const emptyForm: FormState = {
  name: "",
  description: "",
  category: "building",
  assetUrl: "",
  sceneServiceUrl: "",
  sceneLayerType: "scene",
  publishStatus: "none",
};

const inputClasses =
  "w-full py-2 px-3 border border-[#e2e8f0] rounded-lg text-[12.5px] text-[#1e293b] bg-white focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

const labelClasses = "text-[11px] font-semibold text-[#64748b]";

const resolveUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("/model/")) return url;
  return `${backendHost}${url.startsWith("/") ? "" : "/"}${url}`;
};

const publishLabels: Record<NonNullable<BackendModel3D["publishStatus"]>, string> = {
  none: "Chua publish",
  pending: "Dang publish",
  published: "Da publish",
  failed: "Publish loi",
};

export const ModelPanel: React.FC = () => {
  const [models, setModels] = useState<BackendModel3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingModel, setEditingModel] = useState<BackendModel3D | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadModels = async () => {
    setLoading(true);
    setError(null);
    try {
      setModels(await fetchModels());
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách mô hình 3D.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadModels();
  }, []);

  const startCreate = () => {
    setEditingModel(null);
    setForm(emptyForm);
    setFile(null);
  };

  const startEdit = (model: BackendModel3D) => {
    setEditingModel(model);
    setForm({
      name: model.name,
      description: model.description ?? "",
      category: model.category ?? "building",
      assetUrl: model.assetUrl ?? "",
      sceneServiceUrl: model.sceneServiceUrl ?? "",
      sceneLayerType: model.sceneLayerType ?? "scene",
      publishStatus: model.publishStatus ?? "none",
    });
    setFile(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên mô hình.");
      return;
    }
    setError(null);
    try {
      if (editingModel) {
        await updateModel(editingModel.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || "model",
          assetUrl: form.assetUrl.trim() || editingModel.assetUrl || null,
          sceneServiceUrl: form.sceneServiceUrl.trim() || null,
          sceneLayerType: form.sceneLayerType,
          publishStatus: form.publishStatus,
        });
        if (file) {
          await replaceModelFile(editingModel.id, file);
        }
      } else if (file) {
        await uploadModel(file, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || "model",
          sceneServiceUrl: form.sceneServiceUrl.trim() || null,
          sceneLayerType: form.sceneLayerType,
          publishStatus: form.sceneServiceUrl.trim() ? form.publishStatus : "pending",
        });
      } else {
        await createModel({
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || "model",
          assetUrl: form.assetUrl.trim() || null,
          sceneServiceUrl: form.sceneServiceUrl.trim() || null,
          sceneLayerType: form.sceneLayerType,
          publishStatus: form.publishStatus,
        });
      }
      startCreate();
      await loadModels();
    } catch (err) {
      console.error(err);
      setError("Không lưu được mô hình 3D.");
    }
  };

  const removeModel = async (model: BackendModel3D) => {
    if (!window.confirm(`Xóa mô hình "${model.name}"? Feature đang dùng model này sẽ chuyển về modelUrl cũ nếu có.`)) {
      return;
    }
    await deleteModel(model.id);
    await loadModels();
  };

  return (
    <div className="flex flex-col gap-3.5">
      <form
        onSubmit={submit}
        className="border border-[#e2e8f0] bg-white rounded-lg p-3 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1e293b] font-bold text-sm">
            <Box size={16} className="text-[#2563eb]" />
            {editingModel ? "Sửa mô hình 3D" : "Thêm mô hình 3D"}
          </div>
          <button
            type="button"
            onClick={() => void loadModels()}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Tên mô hình</label>
            <input
              className={inputClasses}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Tòa nhà A"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Nhóm</label>
            <input
              className={inputClasses}
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="building"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Mô tả</label>
          <textarea
            className={inputClasses + " min-h-[58px] resize-none"}
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Ghi chú ngắn về mô hình"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClasses}>File GLB/GLTF hoặc URL</label>
          <div className="flex items-center gap-2 text-[#64748b] bg-[#f8fafc] border border-dashed border-[#c8d5e2] rounded-lg p-3">
            <UploadCloud size={16} className="text-[#2563eb]" />
            <input
              type="file"
              accept=".glb,.gltf"
              className="text-xs min-w-0"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <input
            className={inputClasses}
            value={form.assetUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, assetUrl: event.target.value }))}
            placeholder="/uploads/models/model.glb"
          />
        </div>

        <div className="flex flex-col gap-2 border border-[#e2e8f0] rounded-lg bg-[#f8fafc] p-3">
          <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wide">
            ArcGIS Scene Service
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>SceneServer URL</label>
            <input
              className={inputClasses}
              value={form.sceneServiceUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sceneServiceUrl: event.target.value }))
              }
              placeholder="https://tiles.arcgis.com/.../SceneServer"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={labelClasses}>Loai layer</label>
              <select
                className={inputClasses}
                value={form.sceneLayerType}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sceneLayerType: event.target.value as FormState["sceneLayerType"],
                  }))
                }
              >
                <option value="scene">SceneLayer</option>
                <option value="building">BuildingSceneLayer</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClasses}>Trang thai publish</label>
              <select
                className={inputClasses}
                value={form.publishStatus}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    publishStatus: event.target.value as FormState["publishStatus"],
                  }))
                }
              >
                <option value="none">Chua publish</option>
                <option value="pending">Dang publish</option>
                <option value="published">Da publish</option>
                <option value="failed">Publish loi</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-2 text-[11.5px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-2 pb-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 text-[12.5px] font-semibold border border-transparent rounded-lg cursor-pointer bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          >
            {editingModel ? <Save size={13} /> : <Plus size={13} />}
            {editingModel ? "Lưu mô hình" : "Thêm mô hình"}
          </button>
          {editingModel && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center justify-center py-2 px-3.5 text-[12.5px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer bg-white text-[#475569] hover:bg-[#f8fafc]"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="py-8 flex items-center justify-center text-xs text-[#2563eb] gap-2">
          <Loader2 className="animate-spin" size={15} />
          Đang tải mô hình...
        </div>
      ) : models.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
          Chưa có mô hình 3D nào.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {models.map((model) => (
            <div key={model.id} className="border border-[#e2e8f0] rounded-lg bg-white p-3 flex gap-2">
              <div className="w-9 h-9 rounded bg-[#eff6ff] border border-[#dbeafe] flex items-center justify-center text-[#2563eb] shrink-0">
                <Box size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold text-[#1e293b] truncate">{model.name}</div>
                <div className="text-[10px] text-[#64748b] truncate" title={resolveUrl(model.assetUrl)}>
                  {model.assetUrl ? resolveUrl(model.assetUrl) : "Chưa có file"}
                </div>
                <div
                  className="text-[10px] text-[#64748b] truncate mt-0.5"
                  title={model.sceneServiceUrl ?? ""}
                >
                  {model.sceneServiceUrl
                    ? `SceneServer: ${model.sceneServiceUrl}`
                    : "Chua co Scene Service"}
                </div>
                <div className="text-[9.5px] text-[#2563eb] font-bold uppercase mt-1">
                  {model.category ?? "model"} · {model.sceneLayerType ?? "scene"} ·{" "}
                  {publishLabels[model.publishStatus ?? "none"]}
                </div>
              </div>
              <div className="flex items-start gap-1">
                <button
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer"
                  onClick={() => startEdit(model)}
                  title="Sửa"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-[#e2e8f0] text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] cursor-pointer"
                  onClick={() => void removeModel(model)}
                  title="Xóa"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
