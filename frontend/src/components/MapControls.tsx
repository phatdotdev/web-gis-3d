import { useState } from "react";
const GROUND_OPACITY_MAX = 1;
const GROUND_OPACITY_MIN = 0;
const DEFAULT_BASEMAP_STYLE = "arcgis/topographic";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  selectBasemapStyleId,
  selectBasemapStyles,
  selectGroundOpacity,
  selectPanelCollapsed,
  selectTerrainEnabled,
  selectTerrainStyle,
  selectViewState,
  selectShow3DModels,
  selectShowPositioningIcons,
  setBasemapStyleId,
  setGroundOpacity,
  setPanelCollapsed,
  setTerrainEnabled,
  setTerrainStyle,
  setShow3DModels,
  setShowPositioningIcons,
  setLayerPanelOpen,
  selectLayerPanelOpen,
} from "../store/mapSlice";
import { IconLayers, IconSettings } from "./Icons";
import { cn } from "../utils/cn";
import type { TerrainMode } from "../types/map";

type SectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const Section = ({ title, defaultOpen = true, children }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--color-panel-border)] last:border-b-0">
      <button
        className="flex items-center gap-2 w-full py-3 border-none bg-transparent text-[var(--color-panel-text)] font-semibold text-[13px] cursor-pointer text-left transition-colors duration-150 hover:text-[var(--color-panel-accent-strong)]"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className="flex-1">{title}</span>
        <span
          className={cn(
            "text-[11px] text-[var(--color-panel-muted)] transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-2.5 animate-[fade-slide_0.2s_ease]">{children}</div>
      )}
    </div>
  );
};

const toggleSwitchClasses = {
  wrapper: "relative inline-block w-10 h-[22px] shrink-0",
  input: "opacity-0 w-0 h-0 absolute",
  slider:
    "absolute inset-0 rounded-xl bg-[#d9dde5] cursor-pointer transition-colors duration-250 before:content-[''] before:absolute before:w-4 before:h-4 before:left-[3px] before:bottom-[3px] before:rounded-full before:bg-[#94a3b8] before:transition-all before:duration-250 before:ease-[cubic-bezier(0.4,0,0.2,1)]",
  sliderChecked:
    "absolute inset-0 rounded-xl bg-[rgba(0,122,194,0.35)] cursor-pointer transition-colors duration-250 before:content-[''] before:absolute before:w-4 before:h-4 before:left-[3px] before:bottom-[3px] before:rounded-full before:bg-[var(--color-panel-accent)] before:translate-x-[18px] before:shadow-[0_0_8px_rgba(0,122,194,0.5)] before:transition-all before:duration-250 before:ease-[cubic-bezier(0.4,0,0.2,1)]",
};

const MapControls = () => {
  const dispatch = useAppDispatch();

  const terrainEnabled = useAppSelector(selectTerrainEnabled);
  const terrainStyle = useAppSelector(selectTerrainStyle);
  const basemapStyleId = useAppSelector(selectBasemapStyleId);
  const basemapStyles = useAppSelector(selectBasemapStyles);
  const viewState = useAppSelector(selectViewState);
  const groundOpacity = useAppSelector(selectGroundOpacity);
  const panelCollapsed = useAppSelector(selectPanelCollapsed);
  const show3DModels = useAppSelector(selectShow3DModels);
  const showPositioningIcons = useAppSelector(selectShowPositioningIcons);
  const layerPanelOpen = useAppSelector(selectLayerPanelOpen);

  const handleTerrainChange = (next: TerrainMode) => {
    if (next !== "flat") {
      dispatch(setTerrainStyle(next));
    }
  };

  const panelClasses = cn(
    "fixed top-0 right-0 h-screen w-[340px] max-w-[90vw] flex flex-col bg-[var(--color-panel-bg)] border-l border-[var(--color-panel-border)] shadow-[-4px_0_24px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-[950] text-[var(--color-panel-text)] text-[13px] backdrop-blur-[10px]",
    panelCollapsed ? "translate-x-full" : "translate-x-0"
  );

  const layerBtnClasses = cn(
    "absolute top-[210px] left-[15px] w-8 h-8 bg-white border rounded shadow-[0_1px_3px_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center z-[800] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]",
    layerPanelOpen
      ? "border-[#2563eb] text-[#2563eb] bg-[#eff6ff] shadow-[0_0_0_2px_rgba(37,99,235,0.2)]"
      : "border-[#cfd3da] text-[#6a6e79] hover:bg-[#f6f7f9] hover:text-[#151515]",
  );

  const settingsBtnClasses = cn(
    "absolute top-[15px] right-[15px] w-8 h-8 bg-white border rounded shadow-[0_1px_3px_rgba(0,0,0,0.15)] cursor-pointer flex items-center justify-center z-[800] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]",
    !panelCollapsed
      ? "border-[#2563eb] text-[#2563eb] bg-[#eff6ff] shadow-[0_0_0_2px_rgba(37,99,235,0.2)]"
      : "border-[#cfd3da] text-[#6a6e79] hover:bg-[#f6f7f9] hover:text-[#151515]",
  );

  const selectClasses =
    "py-1.5 px-2.5 rounded-lg border border-[var(--color-panel-input-border)] bg-[var(--color-panel-input)] text-[var(--color-panel-text)] font-[inherit] text-xs min-w-0 max-w-[160px] cursor-pointer transition-all duration-200 appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%276%27%3E%3Cpath%20d=%27M0%200l5%206%205-6z%27%20fill=%27%236a6e79%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center] pr-6 hover:border-[#aeb4bf] hover:bg-[#f9fafc] focus:outline-none focus:border-[var(--color-panel-accent)] focus:shadow-[0_0_0_2px_rgba(0,122,194,0.2)] disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <>
      <button
        className={layerBtnClasses}
        onClick={() => dispatch(setLayerPanelOpen(!layerPanelOpen))}
        title="Quản lý dữ liệu"
      >
        <IconLayers size={16} />
      </button>

      <button
        className={settingsBtnClasses}
        onClick={() => dispatch(setPanelCollapsed(!panelCollapsed))}
        title="Thiết lập hiển thị"
      >
        <IconSettings size={16} />
      </button>

      <aside className={panelClasses} style={{ maxHeight: "100vh" }}>
        <div className="flex items-center justify-between py-4 px-5 bg-[#007ac2] text-white shrink-0 shadow-[0_2px_8px_rgba(0,122,194,0.15)]">
          <div className="flex items-center gap-2.5">
            <IconSettings size={18} className="text-white" />
            <h2 className="text-[15px] font-bold text-white m-0 tracking-[0.3px]">
              Thiết lập hiển thị
            </h2>
          </div>
          <button
            className="bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.15)] cursor-pointer text-white flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:bg-[rgba(255,255,255,0.22)] active:scale-95"
            type="button"
            onClick={() => dispatch(setPanelCollapsed(true))}
            title="Đóng panel"
          >
            <span className="text-[14px]">✕</span>
          </button>
        </div>

        {!panelCollapsed && (
          <div className="flex-1 overflow-y-auto py-0 px-4 pb-4 bg-[var(--color-panel-bg)] [&::-webkit-scrollbar]:w-[5px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[rgba(106,110,121,0.25)] [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(106,110,121,0.45)]">
            <Section title="Địa hình" defaultOpen={true}>
              <div className="flex items-center justify-between gap-2.5 py-1.5">
                <span className="text-[12.5px] text-[var(--color-panel-muted)]">
                  Địa hình 3D
                </span>
                <label className={toggleSwitchClasses.wrapper} htmlFor="terrain-toggle">
                  <input
                    id="terrain-toggle"
                    type="checkbox"
                    className={toggleSwitchClasses.input}
                    checked={terrainEnabled}
                    onChange={(e) =>
                      dispatch(setTerrainEnabled(e.target.checked))
                    }
                  />
                  <span
                    className={
                      terrainEnabled
                        ? toggleSwitchClasses.sliderChecked
                        : toggleSwitchClasses.slider
                    }
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2.5 py-1.5">
                <label
                  className="text-[12.5px] text-[var(--color-panel-muted)]"
                  htmlFor="terrain-select"
                >
                  Kiểu địa hình
                </label>
                <select
                  id="terrain-select"
                  className={selectClasses}
                  value={terrainStyle}
                  onChange={(e) =>
                    handleTerrainChange(e.target.value as TerrainMode)
                  }
                  disabled={!terrainEnabled}
                >
                  <option value="world-elevation">World Elevation</option>
                  <option value="world-topobathymetry">Topo Bathymetry</option>
                </select>
              </div>

              <div className="flex flex-col items-stretch gap-1.5 py-1.5">
                <label
                  className="text-[12.5px] text-[var(--color-panel-muted)]"
                  htmlFor="ground-opacity"
                >
                  Độ trong suốt mặt đất:{" "}
                  <strong>{Math.round(groundOpacity * 100)}%</strong>
                </label>
                <input
                  id="ground-opacity"
                  className="w-full"
                  type="range"
                  min={GROUND_OPACITY_MIN}
                  max={GROUND_OPACITY_MAX}
                  step={0.05}
                  value={groundOpacity}
                  onChange={(e) =>
                    dispatch(setGroundOpacity(Number(e.target.value)))
                  }
                  disabled={!terrainEnabled}
                />
              </div>
            </Section>

            <Section title="Lớp dữ liệu 3D" defaultOpen={true}>
              <div className="flex items-center justify-between gap-2.5 py-1.5">
                <span className="text-[12.5px] text-[var(--color-panel-muted)] font-sans">
                  Mô hình 3D
                </span>
                <label className={toggleSwitchClasses.wrapper} htmlFor="models-toggle">
                  <input
                    id="models-toggle"
                    type="checkbox"
                    className={toggleSwitchClasses.input}
                    checked={show3DModels}
                    onChange={(e) =>
                      dispatch(setShow3DModels(e.target.checked))
                    }
                  />
                  <span
                    className={
                      show3DModels
                        ? toggleSwitchClasses.sliderChecked
                        : toggleSwitchClasses.slider
                    }
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-2.5 py-1.5">
                <span className="text-[12.5px] text-[var(--color-panel-muted)] font-sans">
                  Icon định vị
                </span>
                <label className={toggleSwitchClasses.wrapper} htmlFor="positioning-toggle">
                  <input
                    id="positioning-toggle"
                    type="checkbox"
                    className={toggleSwitchClasses.input}
                    checked={showPositioningIcons}
                    onChange={(e) =>
                      dispatch(setShowPositioningIcons(e.target.checked))
                    }
                  />
                  <span
                    className={
                      showPositioningIcons
                        ? toggleSwitchClasses.sliderChecked
                        : toggleSwitchClasses.slider
                    }
                  />
                </label>
              </div>
            </Section>

            <Section title="Bản đồ nền" defaultOpen={true}>
              <div className="flex items-center justify-between gap-2.5 py-1.5">
                <label
                  className="text-[12.5px] text-[var(--color-panel-muted)]"
                  htmlFor="basemap-select"
                >
                  Kiểu bản đồ
                </label>
                <select
                  id="basemap-select"
                  className={selectClasses}
                  value={basemapStyleId}
                  onChange={(e) =>
                    dispatch(setBasemapStyleId(e.target.value))
                  }
                >
                  {basemapStyles.length === 0 ? (
                    <option value={DEFAULT_BASEMAP_STYLE}>
                      {DEFAULT_BASEMAP_STYLE}
                    </option>
                  ) : (
                    basemapStyles.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </Section>

            <Section title="Tọa độ" defaultOpen={false}>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <span className="text-[var(--color-panel-muted)]">Kinh độ</span>
                <span className="text-right text-[var(--color-panel-text)] font-mono tabular-nums">
                  {viewState ? viewState.longitude.toFixed(6) : "—"}
                </span>

                <span className="text-[var(--color-panel-muted)]">Vĩ độ</span>
                <span className="text-right text-[var(--color-panel-text)] font-mono tabular-nums">
                  {viewState ? viewState.latitude.toFixed(6) : "—"}
                </span>

                <span className="text-[var(--color-panel-muted)]">Zoom</span>
                <span className="text-right text-[var(--color-panel-text)] font-mono tabular-nums">
                  {viewState ? viewState.zoom.toFixed(2) : "—"}
                </span>

                <span className="text-[var(--color-panel-muted)]">Tỷ lệ</span>
                <span className="text-right text-[var(--color-panel-text)] font-mono tabular-nums">
                  {viewState
                    ? `1:${Math.round(viewState.scale).toLocaleString()}`
                    : "—"}
                </span>
              </div>
            </Section>
          </div>
        )}
      </aside>
    </>
  );
};

export default MapControls;
