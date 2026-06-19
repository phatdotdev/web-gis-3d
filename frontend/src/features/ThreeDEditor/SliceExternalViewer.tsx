import { useEffect, useRef } from "react";
import SceneView from "@arcgis/core/views/SceneView";
import Map from "@arcgis/core/Map";
import Slice from "@arcgis/core/widgets/Slice";
import { X, Layers } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectEditorSliceViewerOpen,
  selectEditorSceneServiceUrl,
  selectEditorSliceTiltX,
  selectEditorSliceTiltY,
  selectEditorSliceTiltZ,
  setEditorSliceViewerOpen,
} from "../../store/mapSlice";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import BuildingSceneLayer from "@arcgis/core/layers/BuildingSceneLayer";

export const SliceExternalViewer = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectEditorSliceViewerOpen);
  const sceneServiceUrl = useAppSelector(selectEditorSceneServiceUrl);
  const tiltX = useAppSelector(selectEditorSliceTiltX);
  const tiltY = useAppSelector(selectEditorSliceTiltY);
  const tiltZ = useAppSelector(selectEditorSliceTiltZ);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<SceneView | null>(null);
  const sliceWidgetRef = useRef<Slice | null>(null);
  const layerRef = useRef<SceneLayer | BuildingSceneLayer | null>(null);

  // Initialize external SceneView
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const map = new Map({
      basemap: "osm",
      ground: "world-elevation",
    });

    const view = new SceneView({
      container: containerRef.current,
      map: map,
      qualityProfile: "high",
      environment: {
        atmosphereEnabled: true,
        lighting: {
          type: "sun",
          date: new Date(),
          directShadowsEnabled: true,
        },
      },
    });

    viewRef.current = view;

    const slice = new Slice({
      view: view,
    });
    view.ui.add(slice, "bottom-right");
    sliceWidgetRef.current = slice;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [isOpen]);

  // Load active scene service into external viewer
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !isOpen) return;

    if (layerRef.current && view.map) {
      view.map.remove(layerRef.current);
      layerRef.current = null;
    }

    if (sceneServiceUrl) {
      const isBuilding = sceneServiceUrl.toLowerCase().includes("buildingscene");
      const LayerClass = isBuilding ? BuildingSceneLayer : SceneLayer;
      
      const newLayer = new LayerClass({
        url: sceneServiceUrl,
        popupEnabled: false,
      });

      if (view.map) {
        view.map.add(newLayer);
        layerRef.current = newLayer;
      }

      newLayer.when(() => {
        if (newLayer.fullExtent) {
          view.goTo(newLayer.fullExtent).catch(() => {});
        }
      });
    }
  }, [isOpen, sceneServiceUrl]);

  // Sync Slice orientation
  useEffect(() => {
    const slice = sliceWidgetRef.current;
    if (!slice || !isOpen) return;

    if (slice.viewModel.shape) {
      const plane = slice.viewModel.shape as any; // ArcGIS SlicePlane type
      // ArcGIS 4.x SlicePlane supports tilt and heading
      if (plane.tilt !== undefined) plane.tilt = tiltX;
      if (plane.heading !== undefined) plane.heading = tiltY;
      
      // Fallback cho Z rotation, ArcGIS SlicePlane native không có "roll" property public
      // Nhưng có thể xoay bằng cách thao tác geometry hoặc API chuyên sâu nếu cần
      // Hiện tại map Z vào shape nếu được support (phụ thuộc phiên bản ArcGIS)
      // Tương lai có thể áp dụng ma trận transform cho shape
    }
  }, [isOpen, tiltX, tiltY, tiltZ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
      <div className="w-full h-full max-w-[90vw] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden relative border border-[#e2e8f0]">
        
        {/* Header */}
        <div className="h-12 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2 font-bold text-[#1e293b]">
            <Layers size={18} className="text-[#2563eb]" />
            External 3D Viewer — Chế độ Slice
          </div>
          <button
            onClick={() => dispatch(setEditorSliceViewerOpen(false))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* SceneView Container */}
        <div className="flex-1 relative bg-[#f8fafc]" ref={containerRef}>
          {!sceneServiceUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-[#64748b] font-medium text-sm">
              Chưa có Scene Service nào được chọn để hiển thị.
            </div>
          )}
        </div>

        {/* Floating Controls Banner */}
        <div className="absolute bottom-6 left-6 right-auto bg-white/90 backdrop-blur border border-[#e2e8f0] rounded-lg p-3 shadow-lg max-w-[300px]">
          <div className="text-[11px] font-bold text-[#475569] mb-2 uppercase tracking-wide">
            Điều khiển mặt cắt (Đồng bộ)
          </div>
          <div className="flex flex-col gap-1 text-[12px] text-[#334155]">
            <div className="flex justify-between">
              <span>Xoay X (Tilt):</span>
              <span className="font-bold">{Math.round(tiltX)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Xoay Y (Heading):</span>
              <span className="font-bold">{Math.round(tiltY)}°</span>
            </div>
            <div className="flex justify-between">
              <span>Xoay Z (Roll):</span>
              <span className="font-bold">{Math.round(tiltZ)}°</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-[#94a3b8] italic">
            Sử dụng panel ThreeDEditor để thay đổi thông số cắt. Camera trong viewer này hoàn toàn độc lập với bản đồ chính.
          </div>
        </div>

      </div>
    </div>
  );
};
