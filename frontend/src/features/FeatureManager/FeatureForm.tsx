import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, UploadCloud } from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  createEntity,
  updateEntity,
  selectLayers,
  selectPickingCoordinateActive,
  selectPickedCoordinate,
  setPickingCoordinateActive,
  setPickedCoordinate,
} from "../../store/mapSlice";
import type { BackendModel3D, BackendScene3D, BackendSpatialEntity } from "../../types/backend";
import { fetchModels, fetchScenes } from "../../utils/backendApi";

const featureFormSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên đối tượng"),
  layerId: z.string().optional(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  elevation: z.number(),
  scaleX: z.number().min(0.01),
  scaleY: z.number().min(0.01),
  scaleZ: z.number().min(0.01),
  rotationX: z.number(),
  rotationY: z.number(),
  rotationZ: z.number(),
  color: z.string().optional(),
  opacity: z.number().min(0).max(1),
  renderType: z.string(),
  modelId: z.string().optional(),
  sceneId: z.string().optional(),
});

type FormValues = z.infer<typeof featureFormSchema>;

type Props = {
  layerId?: string; // Optional default layerId
  entity?: BackendSpatialEntity; // If editing
  onClose: () => void;
};

const inputClasses =
  "w-full py-2 px-3 border border-[#e2e8f0] rounded-lg text-[13px] text-[#1e293b] bg-white transition-all duration-200 focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] placeholder:text-[#94a3b8]";

const labelClasses = "text-[11.5px] font-semibold text-[#64748b]";

export const FeatureForm: React.FC<Props> = ({ layerId, entity, onClose }) => {
  const dispatch = useAppDispatch();
  const layers = useAppSelector(selectLayers);
  const isEditMode = Boolean(entity);
  const pickingCoordinateActive = useAppSelector(selectPickingCoordinateActive);
  const pickedCoordinate = useAppSelector(selectPickedCoordinate);

  const [modelFile, setModelFile] = useState<File | null>(null);
  const [models, setModels] = useState<BackendModel3D[]>([]);
  const [scenes, setScenes] = useState<BackendScene3D[]>([]);

  // Extract coordinates for default values
  const getCoords = () => {
    if (entity?.geometry && typeof entity.geometry === "object") {
      const geom = entity.geometry as { type?: string; coordinates?: unknown };
      if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
        return {
          longitude: geom.coordinates[0] as number,
          latitude: geom.coordinates[1] as number,
        };
      }
    }
    return { longitude: 105.78, latitude: 10.04 };
  };

  const coords = getCoords();

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      name: entity?.name || "",
      layerId: entity?.layer?.id || layerId || "",
      longitude: coords.longitude,
      latitude: coords.latitude,
      elevation: entity?.elevation ?? 0,
      scaleX: entity?.scaleX ?? entity?.scale ?? 1,
      scaleY: entity?.scaleY ?? entity?.scale ?? 1,
      scaleZ: entity?.scaleZ ?? entity?.scale ?? 1,
      rotationX: entity?.rotationX ?? 0,
      rotationY: entity?.rotationY ?? 0,
      rotationZ: entity?.rotationZ ?? 0,
      color: entity?.color || "#3b82f6",
      opacity: entity?.opacity ?? 1,
      renderType: entity?.renderType || "glb",
      modelId: entity?.model?.id ?? entity?.modelId ?? "",
      sceneId: entity?.scene?.id ?? entity?.sceneId ?? "",
    },
  });

  useEffect(() => {
    let mounted = true;
    const loadCatalogs = async () => {
      try {
        const [modelData, sceneData] = await Promise.all([fetchModels(), fetchScenes()]);
        if (!mounted) return;
        setModels(modelData);
        setScenes(sceneData);
      } catch (err) {
        console.error("Failed to load model/scene catalogs:", err);
      }
    };
    void loadCatalogs();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (entity) {
      reset({
        name: entity.name || "",
        layerId: entity.layer?.id || "",
        longitude: coords.longitude,
        latitude: coords.latitude,
        elevation: entity.elevation ?? 0,
        scaleX: entity.scaleX ?? entity.scale ?? 1,
        scaleY: entity.scaleY ?? entity.scale ?? 1,
        scaleZ: entity.scaleZ ?? entity.scale ?? 1,
        rotationX: entity.rotationX ?? 0,
        rotationY: entity.rotationY ?? 0,
        rotationZ: entity.rotationZ ?? 0,
        color: entity.color || "#3b82f6",
        opacity: entity.opacity ?? 1,
        renderType: entity.renderType || "glb",
        modelId: entity.model?.id ?? entity.modelId ?? "",
        sceneId: entity.scene?.id ?? entity.sceneId ?? "",
      });
    }
  }, [entity, reset, layers]);

  // Watch for coordinate picking results
  useEffect(() => {
    if (pickedCoordinate) {
      setValue("longitude", Number(pickedCoordinate.longitude.toFixed(6)));
      setValue("latitude", Number(pickedCoordinate.latitude.toFixed(6)));
      if (pickedCoordinate.elevation !== undefined) {
        setValue("elevation", Number(pickedCoordinate.elevation.toFixed(1)));
      }
      dispatch(setPickedCoordinate(null));
    }
  }, [pickedCoordinate, setValue, dispatch]);

  const onSubmit = async (data: FormValues) => {
    try {
      const payload = {
        name: data.name,
        layerId: data.layerId || null,
        type: "Point",
        renderType: data.renderType,
        geometry: {
          type: "Point",
          coordinates: [data.longitude, data.latitude],
        },
        elevation: data.elevation,
        scaleX: data.scaleX,
        scaleY: data.scaleY,
        scaleZ: data.scaleZ,
        rotationX: data.rotationX,
        rotationY: data.rotationY,
        rotationZ: data.rotationZ,
        color: data.color || null,
        opacity: data.opacity,
        modelId: data.modelId || null,
        sceneId: data.sceneId || null,
      };

      if (isEditMode && entity) {
        await dispatch(
          updateEntity({
            entityId: entity.id,
            payload,
            modelFile,
          }),
        ).unwrap();
      } else {
        await dispatch(
          createEntity({
            payload,
            modelFile,
          }),
        ).unwrap();
      }
      onClose();
    } catch (err) {
      console.error("Failed to save feature:", err);
    }
  };

  return (
    <div className="animate-[form-slide-in_0.2s_ease]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Name and Layer */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Tên Feature</label>
          <input
            type="text"
            placeholder="Ví dụ: Cây xanh mẫu A"
            className={inputClasses}
            {...register("name")}
          />
          {errors.name && <span className="text-[10px] text-red-500">{errors.name.message}</span>}
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Thuộc Layer</label>
          <select
            className={inputClasses + " cursor-pointer"}
            {...register("layerId")}
          >
            <option value="">Không thuộc layer nào</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.type})
              </option>
            ))}
          </select>
          {errors.layerId && <span className="text-[10px] text-red-500">{errors.layerId.message}</span>}
        </div>

        {/* Coordinates */}
        <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-3 flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-bold text-[#1d4ed8] uppercase tracking-wider">
              Tọa độ địa lý (GPS WGS84)
            </span>
            <button
              type="button"
              onClick={() => dispatch(setPickingCoordinateActive(!pickingCoordinateActive))}
              className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors cursor-pointer border ${
                pickingCoordinateActive
                  ? "bg-[#ef4444] text-white border-transparent hover:bg-[#dc2626]"
                  : "bg-white text-[#2563eb] border-[#bfdbfe] hover:bg-[#f0f6ff] hover:border-[#3b82f6]"
              }`}
            >
              {pickingCoordinateActive ? "Hủy chọn" : "Chọn từ bản đồ"}
            </button>
          </div>

          {pickingCoordinateActive && (
            <div className="text-[10.5px] text-[#b45309] bg-[#fffbeb] border border-[#fde68a] p-2 rounded leading-normal animate-pulse font-sans">
              📍 <strong>Đang chọn tọa độ:</strong> Click vào một điểm bất kỳ trên bản đồ 3D để lấy tọa độ.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Kinh độ (Lon/X)</label>
              <input
                type="number"
                step="0.000001"
                className={inputClasses + " font-mono"}
                {...register("longitude", { valueAsNumber: true })}
              />
              {errors.longitude && <span className="text-[9px] text-red-500">{errors.longitude.message}</span>}
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Vĩ độ (Lat/Y)</label>
              <input
                type="number"
                step="0.000001"
                className={inputClasses + " font-mono"}
                {...register("latitude", { valueAsNumber: true })}
              />
              {errors.latitude && <span className="text-[9px] text-red-500">{errors.latitude.message}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Cao độ Z (Elevation - Mét)</label>
            <input
              type="number"
              step="0.1"
              className={inputClasses + " font-mono"}
              {...register("elevation", { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* Scale X/Y/Z */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
            Kích thước (Scale 3D)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale X</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses + " font-mono"}
                {...register("scaleX", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale Y</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses + " font-mono"}
                {...register("scaleY", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale Z</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses + " font-mono"}
                {...register("scaleZ", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* Rotation X/Y/Z */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
            Góc xoay (Rotation 3D - Độ)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục X</label>
              <input
                type="number"
                step="1"
                className={inputClasses + " font-mono"}
                {...register("rotationX", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục Y</label>
              <input
                type="number"
                step="1"
                className={inputClasses + " font-mono"}
                {...register("rotationY", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục Z</label>
              <input
                type="number"
                step="1"
                className={inputClasses + " font-mono"}
                {...register("rotationZ", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* File and Rendering */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Kiểu hiển thị</label>
            <select className={inputClasses} {...register("renderType")}>
              <option value="glb">Mô hình 3D (GLB)</option>
              <option value="point-3d">Biểu tượng 3D (Symbol)</option>
              <option value="simple">2D Point</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Độ mờ (Opacity)</label>
            <input
              type="number"
              step="0.1"
              className={inputClasses + " font-mono"}
              {...register("opacity", { valueAsNumber: true })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Mô hình 3D dùng lại</label>
            <select className={inputClasses} {...register("modelId")}>
              <option value="">Không chọn</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Scene / Tòa nhà</label>
            <select className={inputClasses} {...register("sceneId")}>
              <option value="">Không chọn</option>
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.parent?.name ? `${scene.parent.name} / ${scene.name}` : scene.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClasses}>Tải lên File 3D (.glb, .gltf)</label>
          <div className="flex items-center gap-2 text-[#64748b] bg-[#f8fafc] border border-dashed border-[#c8d5e2] rounded-lg p-3.5 justify-center cursor-pointer hover:bg-[#f1f5f9] transition-all relative">
            <UploadCloud size={18} className="text-[#3b82f6]" />
            <span className="text-xs font-semibold">
              {modelFile ? modelFile.name : "Chọn file mô hình 3D (.glb)"}
            </span>
            <input
              type="file"
              accept=".glb,.gltf"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setModelFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-2 pb-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-[13px] font-semibold border border-transparent rounded-lg cursor-pointer transition-all leading-none bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-[0.97]"
          >
            {isEditMode ? <Save size={14} /> : <Plus size={14} />}
            <span>{isEditMode ? "Lưu thay đổi" : "Tạo Feature"}</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-[13px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer transition-all leading-none bg-white text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] active:scale-[0.97]"
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};
