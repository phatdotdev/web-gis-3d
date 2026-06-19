import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, UploadCloud } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  createLayerWithFiles,
  updateLayer,
  uploadLayerModel,
  uploadLayerIcon,
  selectLayerStatus,
} from "../../store/mapSlice";
import type { BackendLayer } from "../../types/backend";
import { previewLayerImport, type LayerImportPreview } from "../../utils/backendApi";

const layerFormSchema = z.object({
  name: z.string().optional(),
  type: z.string(),
  visible: z.boolean(),
  minZoom: z.number().min(0).max(24),
  maxZoom: z.number().min(0).max(24),
  zIndex: z.number(),
  elevation: z.number(),
  scale: z.number().min(0.1),
  height: z.number().min(0),
  dataUrl: z.string().optional(),
  color: z.string().optional(),
});

type FormValues = z.infer<typeof layerFormSchema>;

type Props = {
  layer?: BackendLayer;
  onClose: () => void;
};

const inputClasses =
  "w-full py-2 px-3 border border-[#e2e8f0] rounded-lg text-[13px] text-[#1e293b] bg-white transition-all duration-200 focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] placeholder:text-[#94a3b8]";

const labelClasses =
  "text-[11.5px] font-semibold text-[#64748b] tracking-[0.1px]";

export const LayerForm: React.FC<Props> = ({ layer, onClose }) => {
  const dispatch = useAppDispatch();
  const layerStatus = useAppSelector(selectLayerStatus);
  const isEditMode = Boolean(layer);

  const [geoJsonFile, setGeoJsonFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<LayerImportPreview | null>(null);

  const { register, handleSubmit, watch, reset } = useForm<FormValues>({
    resolver: zodResolver(layerFormSchema),
    defaultValues: {
      name: layer?.name ?? "",
      type: layer?.type ?? "Point",
      visible: layer?.visible ?? true,
      minZoom: layer?.minZoom ?? 0,
      maxZoom: layer?.maxZoom ?? 24,
      zIndex: layer?.zIndex ?? 0,
      elevation: layer?.elevation ?? 0,
      scale: layer?.scale ?? 1,
      height: layer?.height ?? 0,
      dataUrl: layer?.dataUrl ?? "",
      color: layer?.metadata?.color ?? "#ef4444",
    },
  });

  useEffect(() => {
    if (layer) {
      reset({
        name: layer.name ?? "",
        type: layer.type ?? "Point",
        visible: layer.visible ?? true,
        minZoom: layer.minZoom ?? 0,
        maxZoom: layer.maxZoom ?? 24,
        zIndex: layer.zIndex ?? 0,
        elevation: layer.elevation ?? 0,
        scale: layer.scale ?? 1,
        height: layer.height ?? 0,
        dataUrl: layer.dataUrl ?? "",
        color: layer.metadata?.color ?? "#ef4444",
      });
    }
  }, [layer, reset]);

  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const dataUrlValue = watch("dataUrl");

  const handleValidateUrl = async () => {
    if (!dataUrlValue) return;
    setIsValidatingUrl(true);
    setErrorMsg(null);
    try {
      const preview = await previewLayerImport(dataUrlValue);
      setImportPreview(preview);
      reset({
        ...watch(),
        name: watch("name") || preview.name,
        dataUrl: preview.dataUrl,
        type: preview.type,
      });

      const featureCount = preview.featureCount;
      if (featureCount === 0) {
        throw new Error("Không tìm thấy đối tượng (features) nào trong nguồn dữ liệu này.");
      }

      if (preview.warnings.length > 0) {
        setErrorMsg(preview.warnings.join(" "));
      }
    } catch (err: any) {
      console.error(err);
      const isNetworkError = err.name === "TypeError" || err.message?.includes("fetch") || err.message?.includes("NetworkError");
      if (isNetworkError) {
        setErrorMsg("Lưu ý: Không thể tải thử ở trình duyệt do CORS. Tuy nhiên, backend vẫn sẽ cố gắng tải trực tiếp URL này khi lưu.");
      } else {
        setErrorMsg(`Lỗi kiểm tra URL: ${err.message || "Không thể truy cập hoặc định dạng dữ liệu không hợp lệ."}`);
      }
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const selectedType = watch("type");
  const isPointType = selectedType === "Point" || selectedType === "MultiPoint";
  const isPointOrLineType =
    isPointType ||
    selectedType === "LineString" ||
    selectedType === "MultiLineString";

  const onSubmit = async (data: FormValues) => {
    setErrorMsg(null);
    try {
      const finalDataUrl = data.dataUrl?.trim() ?? "";
      const sourceMetadata =
        importPreview && importPreview.dataUrl === finalDataUrl
          ? importPreview.metadata
          : finalDataUrl
            ? { sourceType: "geojson-url" }
            : geoJsonFile
              ? { sourceType: "geojson-file" }
              : {};

      if (isEditMode && layer) {
        const payload: Partial<BackendLayer> = {
          name: data.name || layer.name,
          type: data.type,
          visible: data.visible,
          minZoom: data.minZoom,
          maxZoom: data.maxZoom,
          zIndex: data.zIndex,
          elevation: data.elevation,
          scale: data.scale,
          height: data.height,
          dataUrl: finalDataUrl || null,
          metadata: {
            ...(layer.metadata ?? {}),
            ...sourceMetadata,
            color: data.color || "#ef4444",
          },
        };
        await dispatch(updateLayer({ layerId: layer.id, payload })).unwrap();

        if (modelFile) {
          await dispatch(
            uploadLayerModel({ layerId: layer.id, file: modelFile }),
          ).unwrap();
        }
        if (iconFile) {
          await dispatch(
            uploadLayerIcon({ layerId: layer.id, file: iconFile }),
          ).unwrap();
        }
      } else {
        const layerPayload: Partial<BackendLayer> = {
          name: data.name || "Untitled Layer",
          type: data.type,
          visible: data.visible,
          minZoom: data.minZoom,
          maxZoom: data.maxZoom,
          zIndex: data.zIndex,
          elevation: data.elevation,
          scale: data.scale,
          height: data.height,
          dataUrl: finalDataUrl || null,
          metadata: {
            ...sourceMetadata,
            color: data.color || "#ef4444",
          },
        };

        await dispatch(
          createLayerWithFiles({
            layerPayload,
            geoJsonFile,
            modelFile: isPointType ? modelFile : null,
            iconFile: isPointOrLineType ? iconFile : null,
          }),
        ).unwrap();
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Đã xảy ra lỗi khi lưu Layer.");
    }
  };

  return (
    <div className="animate-[form-slide-in_0.2s_ease]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex gap-2.5">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Tên layer</label>
            <input
              type="text"
              placeholder="Tên layer (tuỳ chọn)"
              className={inputClasses}
              {...register("name")}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Loại Geometry</label>
            <select
              className={
                inputClasses +
                " cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%276%27%3E%3Cpath%20d=%27M0%200l5%206%205-6z%27%20fill=%27%2394a3b8%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_12px_center] pr-[30px]"
              }
              {...register("type")}
            >
              <option value="Point">Điểm (Point)</option>
              <option value="LineString">Đường (LineString)</option>
              <option value="Polygon">Vùng (Polygon)</option>
              <option value="custom">Tùy chỉnh (Custom)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Màu sắc ghim định vị (Map Pin Color)</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-10 border border-[#cbd5e1] rounded-lg cursor-pointer p-0.5"
                {...register("color")}
              />
              <input
                type="text"
                placeholder="#ef4444"
                className={inputClasses + " flex-1 font-mono uppercase"}
                {...register("color")}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Min Zoom</label>
            <input
              type="number"
              className={inputClasses + " font-mono"}
              {...register("minZoom", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Max Zoom</label>
            <input
              type="number"
              className={inputClasses + " font-mono"}
              {...register("maxZoom", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className={labelClasses}>Z-Index</label>
            <input
              type="number"
              className={inputClasses + " font-mono"}
              {...register("zIndex", { valueAsNumber: true })}
            />
          </div>
        </div>

        {isPointOrLineType && (
          <div className="flex gap-2.5 animate-[fade-slide_0.2s_ease]">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className={labelClasses}>
                Độ cao Z (Elevation / Depth)
              </label>
              <input
                type="number"
                step="0.1"
                className={inputClasses + " font-mono"}
                {...register("elevation", { valueAsNumber: true })}
              />
            </div>
            {isPointType && (
              <>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className={labelClasses}>Scale (Tỷ lệ)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className={inputClasses + " font-mono"}
                    {...register("scale", { valueAsNumber: true })}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className={labelClasses}>Height (Chiều cao)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className={inputClasses + " font-mono"}
                    {...register("height", { valueAsNumber: true })}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>Data URL (Nguồn dữ liệu từ xa)</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/data.geojson"
              className={inputClasses + " flex-1"}
              {...register("dataUrl")}
            />
            {dataUrlValue && (
              <button
                type="button"
                onClick={handleValidateUrl}
                disabled={isValidatingUrl}
                className="py-2 px-3 text-xs font-semibold border border-[#cbd5e1] rounded-lg bg-white hover:bg-[#f8fafc] text-[#334155] cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
              >
                {isValidatingUrl ? "Đang tải..." : "Kiểm tra"}
              </button>
            )}
          </div>
          <span className="text-[10.5px] text-[#94a3b8]">
            URL trỏ tới file GeoJSON hoặc ArcGIS REST Query. Hệ thống sẽ tự động tải và định cấu hình.
          </span>
          {importPreview && (
            <span className="text-[10.5px] text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] rounded-md px-2 py-1">
              Da nhan dien {importPreview.featureCount} features tu {importPreview.sourceType}.
            </span>
          )}
        </div>

        {isEditMode && (
          <label className="flex items-center gap-2 text-[13px] text-[#334155] cursor-pointer py-1">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#2563eb] rounded cursor-pointer"
              {...register("visible")}
            />
            <span>Hiển thị trên bản đồ</span>
          </label>
        )}

        {!isEditMode && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClasses}>File dữ liệu (GeoJSON)</label>
            <div className="flex items-center gap-2 text-[#64748b]">
              <UploadCloud size={16} />
              <input
                type="file"
                accept=".geojson,.json,application/json,application/geo+json"
                className="text-xs"
                onChange={(e) => setGeoJsonFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        )}

        {isPointOrLineType && (
          <div className="flex flex-col gap-3.5 animate-[fade-slide_0.2s_ease]">
            {isPointType && (
              <div className="flex flex-col gap-1.5 flex-1">
                <label className={labelClasses}>3D Model (.glb, .gltf)</label>
                <div className="flex items-center gap-2 text-[#64748b]">
                  <UploadCloud size={14} />
                  <input
                    type="file"
                    accept=".glb,.gltf"
                    className="text-xs"
                    onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5 flex-1">
              <label className={labelClasses}>Ảnh hiển thị (Icon)</label>
              <div className="flex items-center gap-2 text-[#64748b]">
                <UploadCloud size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs"
                  onChange={(e) => setIconFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 text-[12px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-lg font-sans leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-2 mt-3 pb-8">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 py-2 px-4 text-[13px] font-semibold border border-transparent rounded-lg cursor-pointer transition-all duration-200 leading-none bg-[#2563eb] text-white hover:bg-[#1d4ed8] hover:shadow-[0_2px_8px_rgba(37,99,235,0.25)] active:scale-[0.97] disabled:bg-[#93c5fd] disabled:cursor-not-allowed disabled:shadow-none"
            disabled={layerStatus === "loading"}
          >
            {isEditMode ? <Save size={14} /> : <Plus size={14} />}
            <span>{isEditMode ? "Lưu thay đổi" : "Thêm Layer"}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 py-2 px-4 text-[13px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer transition-all duration-200 leading-none bg-white text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] hover:text-[#334155] active:scale-[0.97]"
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};
