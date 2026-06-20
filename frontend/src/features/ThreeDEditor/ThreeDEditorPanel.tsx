import React, { useEffect, useState } from "react";
import {
  Box,
  Cuboid,
  MousePointer2,
  PenTool,
  RotateCw,
  Save,
  Scissors,
  Square,
  Trash2,
  X,
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  requestEditorFeatureDelete,
  requestEditorFeatureUpdate,
  selectEditorExtrudeColor,
  selectEditorGroundColor,
  selectEditorModels,
  selectEditorOpen,
  selectEditorSceneServiceUrl,
  selectEditorSelectedFeature,
  selectEditorSelectedModel,
  selectEditorSliceDoorsRed,
  selectEditorSliceEnabled,
  selectEditorSliceExcludeDoors,
  selectEditorSliceHeading,
  selectEditorSliceTilt,
  selectEditorTool,
  setEditorExtrudeColor,
  setEditorGroundColor,
  setEditorModels,
  setEditorOpen,
  setEditorSceneService,
  setEditorSelectedModel,
  setEditorSliceDoorsRed,
  setEditorSliceEnabled,
  setEditorSliceExcludeDoors,
  setEditorSliceHeading,
  setEditorSliceTilt,
  setEditorTool,
  type EditorFeatureState,
  type EditorTool,
} from "../../store/mapSlice";
import { cn } from "../../utils/cn";
import { fetchModels } from "../../utils/backendApi";

const toolItems: Array<{ id: EditorTool; label: string; icon: React.ReactNode }> = [
  { id: "select", label: "Chọn", icon: <MousePointer2 size={14} /> },
  { id: "place-model", label: "Đặt model", icon: <Box size={14} /> },
  { id: "draw-extrude", label: "Vẽ khối", icon: <Cuboid size={14} /> },
  { id: "draw-ground", label: "Tạo vùng", icon: <Square size={14} /> },
];

type FormState = {
  size: number;
  rotation: number;
  height: number;
  color: string;
};

const inputClasses =
  "w-full h-8 px-2.5 border border-[#d7dbe3] rounded-md bg-white text-[12px] text-[#1e293b] font-mono focus:outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_2px_rgba(37,99,235,0.12)]";

const labelClasses = "text-[11px] font-semibold text-[#64748b]";

const normalizeNumber = (value: unknown, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const readFeatureForm = (feature: EditorFeatureState | null): FormState => ({
  size: feature?.size ?? 12,
  rotation: feature?.rotation ?? 0,
  height: feature?.height ?? 15,
  color: feature?.color ?? "#38bdf8",
});

export const ThreeDEditorPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const editorOpen = useAppSelector(selectEditorOpen);
  const tool = useAppSelector(selectEditorTool);
  const selectedModel = useAppSelector(selectEditorSelectedModel);
  const models = useAppSelector(selectEditorModels);
  const extrudeColor = useAppSelector(selectEditorExtrudeColor);
  const groundColor = useAppSelector(selectEditorGroundColor);
  const selectedFeature = useAppSelector(selectEditorSelectedFeature);
  const sceneServiceUrl = useAppSelector(selectEditorSceneServiceUrl);
  const sliceEnabled = useAppSelector(selectEditorSliceEnabled);
  const sliceExcludeDoors = useAppSelector(selectEditorSliceExcludeDoors);
  const sliceDoorsRed = useAppSelector(selectEditorSliceDoorsRed);
  const sliceHeading = useAppSelector(selectEditorSliceHeading);
  const sliceTilt = useAppSelector(selectEditorSliceTilt);
  const [form, setForm] = useState<FormState>(() => readFeatureForm(null));

  useEffect(() => {
    setForm(readFeatureForm(selectedFeature));
  }, [selectedFeature]);

  useEffect(() => {
    if (!editorOpen) return;
    let mounted = true;
    const loadModels = async () => {
      try {
        const data = await fetchModels();
        if (mounted) {
          dispatch(setEditorModels(data));
        }
      } catch (err) {
        console.error("Failed to load editor models:", err);
      }
    };
    void loadModels();
    return () => {
      mounted = false;
    };
  }, [editorOpen, dispatch]);

  const applyUpdate = () => {
    dispatch(
      requestEditorFeatureUpdate({
        size: form.size,
        rotation: form.rotation,
        height: form.height,
        color: form.color,
      }),
    );
  };

  return (
    <>
      <button
        className={cn(
          "fixed top-[58px] right-[15px] w-8 h-8 bg-white border rounded shadow-[0_1px_3px_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center z-[820] transition-all focus:outline-none focus:ring-2 focus:ring-[#2563eb]",
          editorOpen
            ? "border-[#2563eb] text-[#2563eb] bg-[#eff6ff]"
            : "border-[#cfd3da] text-[#6a6e79] hover:bg-[#f6f7f9]",
        )}
        onClick={() => dispatch(setEditorOpen(!editorOpen))}
        title="3D Editor"
      >
        <PenTool size={15} />
      </button>

      <button
        className={cn(
          "fixed top-[101px] right-[15px] w-8 h-8 bg-white border rounded shadow-[0_1px_3px_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center z-[820] transition-all focus:outline-none focus:ring-2 focus:ring-[#f97316]",
          sliceEnabled
            ? "border-[#f97316] text-[#ea580c] bg-[#fff7ed]"
            : "border-[#cfd3da] text-[#6a6e79] hover:bg-[#f6f7f9]",
        )}
        onClick={() => dispatch(setEditorSliceEnabled(!sliceEnabled))}
        title={sliceEnabled ? "Tắt Slice" : "Bật Slice và chọn vị trí"}
      >
        <Scissors size={15} />
      </button>

      <aside
        className={cn(
          "fixed top-0 right-0 h-screen w-[360px] max-w-[92vw] z-[960] bg-white border-l border-[#d7dbe3] shadow-[-4px_0_24px_rgba(0,0,0,0.1)] transition-transform duration-300 flex flex-col",
          editorOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 bg-[#0f4c81] text-white">
          <div className="flex items-center gap-2">
            <PenTool size={16} />
            <h2 className="m-0 text-[14px] font-bold">3D Editor</h2>
          </div>
          <button
            className="w-7 h-7 rounded-md border border-white/15 bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer"
            onClick={() => dispatch(setEditorOpen(false))}
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <section className="flex flex-col gap-2">
            <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wide">
              Công cụ
            </div>
            <div className="grid grid-cols-2 gap-2">
              {toolItems.map((item) => (
                <button
                  key={item.id}
                  className={cn(
                    "h-9 rounded-md border text-[12px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors",
                    tool === item.id
                      ? "border-[#2563eb] bg-[#eff6ff] text-[#1d4ed8]"
                      : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]",
                  )}
                  onClick={() => dispatch(setEditorTool(item.id))}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2 border border-[#e2e8f0] rounded-lg p-3 bg-[#f8fafc]">
            <label className={labelClasses}>Model để đặt</label>
            <select
              className={inputClasses + " font-sans"}
              value={selectedModel}
              onChange={(event) => dispatch(setEditorSelectedModel(event.target.value))}
              disabled={models.length === 0}
            >
              {models.length === 0 && (
                <option value="">Chưa có model trong backend</option>
              )}
              {models.filter((model) => Boolean(model.assetUrl)).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </section>

          <section className="flex flex-col gap-2 border border-[#e2e8f0] rounded-lg p-3 bg-white">
            <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wide">
              Scene Service
            </div>
            <select
              className={inputClasses + " font-sans"}
              value={sceneServiceUrl ?? ""}
              onChange={(event) => {
                const model = models.find((item) => item.sceneServiceUrl === event.target.value);
                dispatch(
                  setEditorSceneService({
                    url: event.target.value || null,
                    layerType: model?.sceneLayerType ?? "scene",
                  }),
                );
              }}
            >
              <option value="">Không load Scene Service</option>
              {models
                .filter((model) => Boolean(model.sceneServiceUrl))
                .map((model) => (
                  <option key={model.id} value={model.sceneServiceUrl ?? ""}>
                    {model.name} ({model.sceneLayerType ?? "scene"})
                  </option>
                ))}
            </select>
            <label className="flex items-center gap-2 text-[12px] text-[#334155]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#2563eb]"
                checked={sliceExcludeDoors}
                onChange={(event) => dispatch(setEditorSliceExcludeDoors(event.target.checked))}
              />
              Exclude sublayer Doors
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#334155]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#2563eb]"
                checked={sliceDoorsRed}
                onChange={(event) => dispatch(setEditorSliceDoorsRed(event.target.checked))}
              />
              Đổi Doors sang đỏ
            </label>
            {sliceEnabled && (
              <div className="flex flex-col gap-2 pt-2 border-t border-[#e2e8f0]">
                <div className="flex items-center justify-between gap-2">
                  <label className={labelClasses}>Xoay ngang</label>
                  <input
                    type="number"
                    className="w-16 h-7 px-2 border border-[#d7dbe3] rounded-md text-[11px] font-mono"
                    value={sliceHeading}
                    min={0}
                    max={360}
                    onChange={(event) => dispatch(setEditorSliceHeading(normalizeNumber(event.target.value, 0)))}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={sliceHeading}
                  onChange={(event) => dispatch(setEditorSliceHeading(normalizeNumber(event.target.value, 0)))}
                />
                <div className="flex items-center justify-between gap-2">
                  <label className={labelClasses}>Nghiêng mặt cắt</label>
                  <input
                    type="number"
                    className="w-16 h-7 px-2 border border-[#d7dbe3] rounded-md text-[11px] font-mono"
                    value={sliceTilt}
                    min={0}
                    max={180}
                    onChange={(event) => dispatch(setEditorSliceTilt(normalizeNumber(event.target.value, 90)))}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={1}
                  value={sliceTilt}
                  onChange={(event) => dispatch(setEditorSliceTilt(normalizeNumber(event.target.value, 90)))}
                />
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5 border border-[#e2e8f0] rounded-lg p-3">
              <label className={labelClasses}>Màu khối</label>
              <input
                type="color"
                className="h-9 w-full rounded border border-[#e2e8f0] bg-white cursor-pointer"
                value={extrudeColor}
                onChange={(event) => {
                  dispatch(setEditorExtrudeColor(event.target.value));
                  setForm((prev) => ({ ...prev, color: event.target.value }));
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5 border border-[#e2e8f0] rounded-lg p-3">
              <label className={labelClasses}>Màu vùng</label>
              <input
                type="color"
                className="h-9 w-full rounded border border-[#e2e8f0] bg-white cursor-pointer"
                value={groundColor}
                onChange={(event) => {
                  dispatch(setEditorGroundColor(event.target.value));
                  setForm((prev) => ({ ...prev, color: event.target.value }));
                }}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3 border border-[#dbeafe] rounded-lg p-3 bg-[#eff6ff]">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-[#1d4ed8] uppercase tracking-wide">
                Đối tượng đang chọn
              </div>
              {selectedFeature && (
                <span className="text-[10px] font-bold text-[#2563eb] bg-white px-1.5 py-0.5 rounded">
                  {selectedFeature.kind}
                </span>
              )}
            </div>

            {!selectedFeature ? (
              <div className="text-xs text-[#64748b] leading-relaxed">
                Chọn một model/khối/vùng trên bản đồ, hoặc dùng công cụ đặt/vẽ để tạo mới.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className={labelClasses}>Size / Scale</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      className={inputClasses}
                      value={form.size}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          size: normalizeNumber(event.target.value, prev.size),
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClasses}>Rotation</label>
                    <div className="relative">
                      <RotateCw className="absolute left-2 top-2 text-[#94a3b8]" size={13} />
                      <input
                        type="number"
                        step="1"
                        className={inputClasses + " pl-7"}
                        value={form.rotation}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            rotation: normalizeNumber(event.target.value, prev.rotation),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className={labelClasses}>Chiều cao khối</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      className={inputClasses}
                      value={form.height}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          height: normalizeNumber(event.target.value, prev.height),
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClasses}>Màu đối tượng</label>
                    <input
                      type="color"
                      className="h-8 w-full rounded border border-[#d7dbe3] bg-white cursor-pointer"
                      value={form.color}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, color: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569]">
                  <div>Area: <b>{selectedFeature.area?.toFixed(2) ?? "-"} m²</b></div>
                  <div>Distance: <b>{selectedFeature.distance?.toFixed(2) ?? "-"} m</b></div>
                  <div>Deflection: <b>{selectedFeature.deflection?.toFixed(1) ?? "-"}°</b></div>
                  <div>Elevation: <b>{selectedFeature.elevation?.toFixed(1) ?? "-"} m</b></div>
                </div>

                <div className="flex gap-2 pt-1 pb-2">
                  <button
                    className="flex-1 h-9 rounded-md bg-[#2563eb] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#1d4ed8]"
                    onClick={applyUpdate}
                  >
                    <Save size={13} />
                    Update
                  </button>
                  <button
                    className="flex-1 h-9 rounded-md bg-[#fee2e2] text-[#dc2626] text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#fecaca]"
                    onClick={() => dispatch(requestEditorFeatureDelete())}
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </aside>
    </>
  );
};

export default ThreeDEditorPanel;
