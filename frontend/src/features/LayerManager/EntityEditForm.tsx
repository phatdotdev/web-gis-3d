import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, UploadCloud } from "lucide-react";

import { useAppDispatch } from "../../store/hooks";
import { updateEntity } from "../../store/mapSlice";
import type { BackendSpatialEntity } from "../../types/backend";

const entitySchema = z.object({
  name: z.string().optional(),
  color: z.string().optional(),
  opacity: z.number().min(0).max(1),
  width: z.number().min(0),
  height: z.number().min(0),
  elevation: z.number(),
  scaleX: z.number().min(0.01).optional(),
  scaleY: z.number().min(0.01).optional(),
  scaleZ: z.number().min(0.01).optional(),
  rotationX: z.number().optional(),
  rotationY: z.number().optional(),
  rotationZ: z.number().optional(),
});

type FormValues = z.infer<typeof entitySchema>;

type Props = {
  entity: BackendSpatialEntity;
  onCancel: () => void;
};

const inputClasses =
  "w-full py-1.5 px-2.5 border border-[#e2e8f0] rounded-lg text-[12.5px] text-[#1e293b] bg-white transition-all duration-200 focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)] placeholder:text-[#94a3b8] font-mono";

const labelClasses = "text-[11px] font-semibold text-[#64748b]";

export const EntityEditForm: React.FC<Props> = ({ entity, onCancel }) => {
  const dispatch = useAppDispatch();
  const [modelFile, setModelFile] = useState<File | null>(null);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      name: entity.name || "",
      color: entity.color || "",
      opacity: entity.opacity ?? 1,
      width: entity.width ?? 1,
      height: entity.height ?? 0,
      elevation: entity.elevation ?? 0,
      scaleX: entity.scaleX ?? entity.scale ?? 1,
      scaleY: entity.scaleY ?? entity.scale ?? 1,
      scaleZ: entity.scaleZ ?? entity.scale ?? 1,
      rotationX: entity.rotationX ?? 0,
      rotationY: entity.rotationY ?? 0,
      rotationZ: entity.rotationZ ?? 0,
    },
  });

  useEffect(() => {
    reset({
      name: entity.name || "",
      color: entity.color || "",
      opacity: entity.opacity ?? 1,
      width: entity.width ?? 1,
      height: entity.height ?? 0,
      elevation: entity.elevation ?? 0,
      scaleX: entity.scaleX ?? entity.scale ?? 1,
      scaleY: entity.scaleY ?? entity.scale ?? 1,
      scaleZ: entity.scaleZ ?? entity.scale ?? 1,
      rotationX: entity.rotationX ?? 0,
      rotationY: entity.rotationY ?? 0,
      rotationZ: entity.rotationZ ?? 0,
    });
  }, [entity, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await dispatch(
        updateEntity({
          entityId: entity.id,
          payload: data,
          modelFile,
        }),
      ).unwrap();
      onCancel();
    } catch (err) {
      console.error("Failed to update entity:", err);
    }
  };

  return (
    <div className="mt-2.5 pt-2.5 border-t border-[#e2e8f0] animate-[form-slide-in_0.2s_ease]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Tên đối tượng</label>
            <input type="text" className={inputClasses} {...register("name")} />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Màu sắc (Hex)</label>
            <input type="text" className={inputClasses} {...register("color")} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Độ mờ (0-1)</label>
            <input
              type="number"
              step="0.1"
              className={inputClasses}
              {...register("opacity", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Độ rộng (m)</label>
            <input
              type="number"
              step="0.1"
              className={inputClasses}
              {...register("width", { valueAsNumber: true })}
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className={labelClasses}>Cao độ Z (m)</label>
            <input
              type="number"
              step="0.1"
              className={inputClasses}
              {...register("elevation", { valueAsNumber: true })}
            />
          </div>
        </div>

        {/* 3D Transform Properties */}
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-2.5 flex flex-col gap-2">
          <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider">
            Tọa độ tỉ lệ (Scale 3D)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale X</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses}
                {...register("scaleX", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale Y</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses}
                {...register("scaleY", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Scale Z</label>
              <input
                type="number"
                step="0.1"
                className={inputClasses}
                {...register("scaleZ", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="text-[10px] font-bold text-[#475569] uppercase tracking-wider mt-1">
            Góc xoay (Rotation 3D - Độ)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục X</label>
              <input
                type="number"
                step="1"
                className={inputClasses}
                {...register("rotationX", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục Y</label>
              <input
                type="number"
                step="1"
                className={inputClasses}
                {...register("rotationY", { valueAsNumber: true })}
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className={labelClasses}>Trục Z</label>
              <input
                type="number"
                step="1"
                className={inputClasses}
                {...register("rotationZ", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>

        {/* GLB File Upload */}
        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Tải lên file 3D (.glb, .gltf)</label>
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

        <div className="flex gap-2 mt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-[12px] font-semibold border border-transparent rounded-lg cursor-pointer transition-all duration-200 leading-none bg-[#2563eb] text-white hover:bg-[#1d4ed8] active:scale-[0.97]"
          >
            <Save size={13} />
            <span>Lưu thay đổi</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-[12px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer transition-all duration-200 leading-none bg-white text-[#475569] hover:bg-[#f8fafc] hover:border-[#cbd5e1] active:scale-[0.97]"
            onClick={onCancel}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};
