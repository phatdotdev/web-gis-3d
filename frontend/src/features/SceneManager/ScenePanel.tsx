import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  ChevronDown,
  ChevronRight,
  Compass,
  Move,
  Check,
  AlertCircle,
  MapPin,
  XCircle,
  MousePointerClick,
  Box,
} from "lucide-react";

import type { BackendScene3D, BackendSpatialEntity } from "../../types/backend";
import {
  createScene,
  deleteScene,
  fetchScenes,
  updateScene,
  uploadAndPlaceScene,
  updateSceneTransform,
  confirmScenePlacement,
  fetchSpatialEntity,
} from "../../utils/backendApi";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  selectSceneEditMode,
  selectSceneEditingNodeId,
  setSceneEditMode,
  setSceneEditingNodeId,
  goToPosition,
  startPlacement,
  cancelPlacement,
  confirmPlacement,
  loadLayers,
  selectPlacementMode,
  selectPlacementSceneId,
  selectPlacementPreview,
  updatePlacementPreview,
  selectInspectedEntity,
  setInspectedEntity,
} from "../../store/mapSlice";

type FormState = {
  name: string;
  description: string;
  parentId: string;
  sortOrder: number;
  visible: boolean;
};

type ScenePanelMode = "list" | "create" | "edit";

const emptyForm: FormState = {
  name: "",
  description: "",
  parentId: "",
  sortOrder: 0,
  visible: true,
};

const inputClasses =
  "w-full py-1.5 px-2.5 border border-[#e2e8f0] rounded-lg text-[12px] text-[#1e293b] bg-white focus:outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";

const labelClasses = "text-[10px] font-bold text-[#64748b] uppercase tracking-wider";

// Helper to project offset (meters) to geographic coordinates for zooming
const getChildCoordinates = (parent: BackendScene3D, child: BackendScene3D) => {
  const parentLat = parent.position?.y ?? 0;
  const parentLng = parent.position?.x ?? 0;
  const parentElevation = parent.position?.z ?? 0;
  const parentHeading = parent.rotation?.z ?? 0;

  const headingRad = (parentHeading * Math.PI) / 180;
  const offset = child.position ?? { x: 0, y: 0, z: 0 };
  const baseDx = offset.x;
  const baseDy = -offset.z;
  const baseDz = offset.y;

  const dx = baseDx * Math.cos(headingRad) + baseDy * Math.sin(headingRad);
  const dy = -baseDx * Math.sin(headingRad) + baseDy * Math.cos(headingRad);

  const deltaLatitude = dy / 111132;
  const deltaLongitude = dx / (111132 * Math.cos((parentLat * Math.PI) / 180));

  return {
    longitude: parentLng + deltaLongitude,
    latitude: parentLat + deltaLatitude,
    elevation: parentElevation + baseDz,
  };
};

const convertSceneToVirtualEntity = (scene: BackendScene3D, allScenes: BackendScene3D[]): BackendSpatialEntity => {
  let coords = { longitude: 0, latitude: 0, elevation: 0 };

  if ((scene.lodLevel ?? 0) === 0 && scene.position) {
    coords = {
      longitude: scene.position.x,
      latitude: scene.position.y,
      elevation: scene.position.z ?? 0,
    };
  } else if ((scene.lodLevel ?? 0) > 0 && scene.parent) {
    const parent = allScenes.find((s) => s.id === scene.parent?.id);
    if (parent) {
      const childCoords = getChildCoordinates(parent, scene);
      coords = {
        longitude: childCoords.longitude,
        latitude: childCoords.latitude,
        elevation: childCoords.elevation,
      };
    }
  }

  return {
    id: scene.id,
    name: scene.name,
    type: "scene_node",
    renderType: "3d_model",
    geometry: {
      type: "Point",
      coordinates: [coords.longitude, coords.latitude],
    },
    elevation: coords.elevation,
    scaleX: scene.scale?.x ?? 1,
    scaleY: scene.scale?.y ?? 1,
    scaleZ: scene.scale?.z ?? 1,
    rotationX: scene.rotation?.x ?? 0,
    rotationY: scene.rotation?.y ?? 0,
    rotationZ: scene.rotation?.z ?? 0,
    modelUrl: scene.fileUrl || null,
    metadata: {
      ...(scene.metadata ?? {}),
      lodLevel: scene.lodLevel ?? 0,
      description: scene.description ?? `Khối mô hình LOD ${scene.lodLevel ?? 0}`,
    },
    scene: scene,
    sceneId: scene.id,
    images: [],
  };
};

const emitSceneReload = () => {
  window.dispatchEvent(new Event("scene3d:reload"));
};

export const ScenePanel: React.FC = () => {
  const dispatch = useAppDispatch();
  const sceneEditMode = useAppSelector(selectSceneEditMode);
  const editingNodeId = useAppSelector(selectSceneEditingNodeId);
  const placementMode = useAppSelector(selectPlacementMode);
  const placementSceneId = useAppSelector(selectPlacementSceneId);
  const placementPreview = useAppSelector(selectPlacementPreview);
  const inspectedEntity = useAppSelector(selectInspectedEntity);

  const [scenes, setScenes] = useState<BackendScene3D[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingScene, setEditingScene] = useState<BackendScene3D | null>(null);
  const [panelMode, setPanelMode] = useState<ScenePanelMode>("list");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  // Upload glTF split state
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // Manual transform edit state
  const [transformPos, setTransformPos] = useState({ x: 0, y: 0, z: 0 });
  const [transformRot, setTransformRot] = useState({ x: 0, y: 0, z: 0 });
  const [transformScale, setTransformScale] = useState({ x: 1, y: 1, z: 1 });
  const [savingTransform, setSavingTransform] = useState(false);

  // Collapsible Tree structure states
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load all scenes from backend
  const loadScenes = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchScenes();
      setScenes(data);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách scene.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScenes();
  }, []);

  // Update manual transform inputs when selected editingNodeId changes
  const activeEditingNode = useMemo(() => {
    if (!editingNodeId) return null;
    return scenes.find((s) => s.id === editingNodeId) || null;
  }, [editingNodeId, scenes]);

  useEffect(() => {
    if (activeEditingNode) {
      setTransformPos(activeEditingNode.position ?? { x: 0, y: 0, z: 0 });
      setTransformRot(activeEditingNode.rotation ?? { x: 0, y: 0, z: 0 });
      setTransformScale(activeEditingNode.scale ?? { x: 1, y: 1, z: 1 });
    }
  }, [activeEditingNode]);

  const closeSceneForm = () => {
    setPanelMode("list");
    setEditingScene(null);
    setForm(emptyForm);
    setError(null);
  };

  const startCreate = () => {
    setPanelMode("create");
    setEditingScene(null);
    setForm(emptyForm);
    setError(null);
  };

  const startEdit = (scene: BackendScene3D) => {
    setPanelMode("edit");
    setEditingScene(scene);
    setError(null);
    setForm({
      name: scene.name,
      description: scene.description ?? "",
      parentId: scene.parent?.id ?? "",
      sortOrder: scene.sortOrder ?? 0,
      visible: scene.visible,
    });
  };

  // Submit create/update basic scene info
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Vui lòng nhập tên scene.");
      return;
    }
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      parentId: form.parentId || null,
      sortOrder: form.sortOrder,
      visible: form.visible,
    };
    try {
      if (editingScene) {
        await updateScene(editingScene.id, payload);
      } else {
        await createScene(payload);
      }
      closeSceneForm();
      await loadScenes();
      emitSceneReload();
    } catch (err) {
      console.error(err);
      setError("Không lưu được scene.");
    }
  };

  // Start Upload & Place pipeline
  const handleStartUploadAndPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Vui lòng chọn file 3D (.glb/.gltf).");
      return;
    }
    if (!uploadName.trim()) {
      setError("Vui lòng nhập tên mô hình tổng.");
      return;
    }
    setError(null);
    const localUrl = URL.createObjectURL(selectedFile);
    dispatch(startPlacement({ sceneId: "upload", fileUrl: localUrl }));
  };

  // Save manual transform inputs
  const handleSaveTransform = async () => {
    if (!editingNodeId) return;
    setSavingTransform(true);
    try {
      await updateSceneTransform(editingNodeId, {
        position: transformPos,
        rotation: transformRot,
        scale: transformScale,
      });
      await loadScenes();
      emitSceneReload();
    } catch (err) {
      console.error(err);
      setError("Không lưu được tọa độ transform.");
    } finally {
      setSavingTransform(false);
    }
  };

  // Delete scene
  const removeScene = async (scene: BackendScene3D) => {
    if (!window.confirm(`Xóa scene "${scene.name}"? Tất cả các node con sẽ bị xóa hoàn toàn.`)) {
      return;
    }
    await deleteScene(scene.id);
    if (editingNodeId === scene.id) {
      dispatch(setSceneEditingNodeId(null));
    }
    if (placementSceneId === scene.id) {
      dispatch(cancelPlacement());
    }
    await loadScenes();
    emitSceneReload();
  };

  // Confirm placement
  const [confirmingPlacement, setConfirmingPlacement] = useState(false);
  const handleConfirmPlacement = async () => {
    if (!placementSceneId || !placementPreview) return;
    setConfirmingPlacement(true);
    setError(null);
    try {
      if (placementSceneId === "upload") {
        if (!selectedFile || !uploadName.trim()) {
           setError("Dữ liệu file hoặc tên bị thiếu.");
           setConfirmingPlacement(false);
           return;
        }
        await uploadAndPlaceScene(selectedFile, uploadName.trim(), placementPreview, uploadDesc.trim() || undefined);
        void dispatch(loadLayers());
        setUploadName("");
        setUploadDesc("");
        setSelectedFile(null);
      } else {
        const scaleVal = (placementPreview as any).scale ?? 1;
        await confirmScenePlacement(placementSceneId, {
          position: { x: placementPreview.longitude, y: placementPreview.latitude, z: placementPreview.elevation },
          rotation: { x: 0, y: 0, z: placementPreview.heading },
          scale: { x: scaleVal, y: scaleVal, z: scaleVal },
        });
      }
      dispatch(confirmPlacement());
      await loadScenes();
      emitSceneReload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Không thể xác nhận vị trí.");
    } finally {
      setConfirmingPlacement(false);
    }
  };

  // Camera fly-to helper
  const handleFlyTo = (scene: BackendScene3D) => {
    if ((scene.lodLevel ?? 0) === 0 && scene.position) {
      dispatch(
        goToPosition({
          longitude: scene.position.x,
          latitude: scene.position.y,
          scale: 50,
        })
      );
    } else if ((scene.lodLevel ?? 0) > 0 && scene.parent) {
      // Find parent coordinate and compute child absolute position
      const parent = scenes.find((s) => s.id === scene.parent?.id);
      if (parent && parent.position) {
        const coords = getChildCoordinates(parent, scene);
        dispatch(
          goToPosition({
            longitude: coords.longitude,
            latitude: coords.latitude,
            scale: 50,
          })
        );
      }
    }
  };

  // Camera select/inspect helper
  const handleSelectNode = async (scene: BackendScene3D) => {
    // 1. Fly to target
    handleFlyTo(scene);

    // 2. Select & inspect
    if (scene.entities && scene.entities.length > 0) {
      const entityId = scene.entities[0].id;
      try {
        const entity = await fetchSpatialEntity(entityId);
        dispatch(setInspectedEntity(entity));
      } catch {
        const virtual = convertSceneToVirtualEntity(scene, scenes);
        dispatch(setInspectedEntity(virtual));
      }
    } else {
      const virtual = convertSceneToVirtualEntity(scene, scenes);
      dispatch(setInspectedEntity(virtual));
    }

    // 3. Mark as editing node (for highlight)
    dispatch(setSceneEditingNodeId(scene.id));
  };

  // Tree helper: construct scene tree and sort them
  const sceneTree = useMemo(() => {
    const map: Record<string, BackendScene3D & { children: BackendScene3D[] }> = {};
    scenes.forEach((s) => {
      map[s.id] = { ...s, children: [] };
    });
    const roots: (BackendScene3D & { children: BackendScene3D[] })[] = [];
    scenes.forEach((s) => {
      const parentId = s.parent?.id;
      if (parentId && map[parentId]) {
        map[parentId].children.push(map[s.id]);
      } else {
        roots.push(map[s.id]);
      }
    });

    // Sort roots & children
    const sortNodes = (nodes: typeof roots) => {
      nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
      nodes.forEach((n) => sortNodes(n.children as any));
    };
    sortNodes(roots);
    return roots;
  }, [scenes]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Render tree node recursive component
  const renderTreeNode = (node: BackendScene3D & { children: BackendScene3D[] }) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const isEditing = editingNodeId === node.id;
    const NodeIcon = (node.lodLevel ?? 0) === 0 ? Building2 : Box;

    return (
      <div key={node.id} className="flex flex-col">
        <div
          className={`flex items-center justify-between py-1.5 px-2 rounded-lg text-[12px] group ${
            isEditing
              ? "bg-[#eff6ff] text-[#1d4ed8] border border-[#dbeafe]"
              : "hover:bg-[#f8fafc] text-[#334155]"
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              className={`p-0.5 rounded hover:bg-[#e2e8f0] text-[#64748b] cursor-pointer ${
                hasChildren ? "visible" : "invisible"
              }`}
            >
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <span
              onClick={() => void handleSelectNode(node)}
              className="font-medium cursor-pointer truncate flex-1 hover:underline inline-flex items-center gap-1.5"
            >
              <NodeIcon size={12} className={(node.lodLevel ?? 0) === 0 ? "text-[#2563eb]" : "text-[#64748b]"} />
              <span className="truncate">{node.name}</span>
              <span className="text-[9px] ml-1.5 text-[#94a3b8]">
                (LOD {node.lodLevel})
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => void handleSelectNode(node)}
              className={`w-5 h-5 inline-flex items-center justify-center rounded text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer ${
                inspectedEntity?.id === node.id || inspectedEntity?.sceneId === node.id ? "text-[#2563eb] bg-[#eff6ff]" : ""
              }`}
              title="Chọn & Xem thông tin"
            >
              <MousePointerClick size={10} />
            </button>
            <button
              onClick={() => handleFlyTo(node)}
              className="w-5 h-5 inline-flex items-center justify-center rounded text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer"
              title="Fly to"
            >
              <Compass size={11} />
            </button>
            {node.lodLevel === 0 && (
              <button
                onClick={() => {
                  setPanelMode("edit");
                  dispatch(startPlacement({ sceneId: node.id, fileUrl: node.fileUrl }));
                }}
                className={`w-5 h-5 inline-flex items-center justify-center rounded text-[#64748b] hover:text-[#eab308] hover:bg-[#fefce8] cursor-pointer ${
                  placementSceneId === node.id ? "text-[#eab308] bg-[#fefce8]" : ""
                }`}
                title="Ghim vị trí"
              >
                <MapPin size={10} />
              </button>
            )}
            {node.lodLevel === 0 && (
              <button
                onClick={() => startEdit(node)}
                className="w-5 h-5 inline-flex items-center justify-center rounded text-[#64748b] hover:text-[#2563eb] hover:bg-[#eff6ff] cursor-pointer"
                title="Sửa info"
              >
                <Edit2 size={10} />
              </button>
            )}
            <button
              onClick={() => void removeScene(node)}
              className="w-5 h-5 inline-flex items-center justify-center rounded text-[#64748b] hover:text-[#dc2626] hover:bg-[#fef2f2] cursor-pointer"
              title="Xóa"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="pl-4 border-l border-[#e2e8f0] ml-2.5 mt-0.5 flex flex-col gap-0.5">
            {node.children.map((child) => renderTreeNode(child as any))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {panelMode !== "list" && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={closeSceneForm}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748b] hover:text-[#1e293b] border border-[#e2e8f0] bg-white cursor-pointer py-1.5 px-2.5 rounded-lg"
          >
            <ChevronRight size={13} className="rotate-180" />
            Quay lại danh sách
          </button>
          <span className="text-[11px] font-bold text-[#2563eb] bg-[#eff6ff] px-2 py-1 rounded">
            {panelMode === "create" ? "Thêm scene" : "Sửa scene"}
          </span>
        </div>
      )}

      {/* SECTION 1: PIPELINE UPLOAD & BÓC TÁCH */}
      {panelMode === "create" && (
        <form
          onSubmit={handleStartUploadAndPlace}
          className="border border-[#e2e8f0] bg-white rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
        <div className="flex items-center gap-2 text-[#1e293b] font-bold text-sm">
          <Upload size={16} className="text-[#2563eb]" />
          Bóc tách mô hình 3D tổng (glTF)
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>File 3D tổng (.glb, .gltf)</label>
            <input
              type="file"
              accept=".glb,.gltf"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="text-[12px] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11.5px] file:font-semibold file:bg-[#eff6ff] file:text-[#2563eb] hover:file:bg-[#dbeafe] file:cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className={labelClasses}>Tên mô hình</label>
              <input
                className={inputClasses}
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Ví dụ: Tòa nhà CUSC"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClasses}>Mô tả tổng</label>
              <input
                className={inputClasses}
                value={uploadDesc}
                onChange={(e) => setUploadDesc(e.target.value)}
                placeholder="Thông tin tòa nhà..."
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-[12.5px] font-semibold border border-transparent rounded-lg cursor-pointer bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors"
        >
          <MapPin size={13} />
          Chọn vị trí trên bản đồ
        </button>
        </form>
      )}

      {/* SECTION 2: MAP EDITING MODE CONTROLS */}
      {panelMode !== "list" && (
        <div className="border border-[#e2e8f0] bg-white rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#1e293b] font-bold text-sm">
            <Move size={16} className="text-[#eab308]" />
            Chế độ chỉnh sửa trên bản đồ
          </div>
          <button
            type="button"
            onClick={() => dispatch(setSceneEditMode(!sceneEditMode))}
            className={`py-1.5 px-3 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${
              sceneEditMode
                ? "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                : "bg-[#f59e0b] text-white hover:bg-[#d97706]"
            }`}
          >
            {sceneEditMode ? "Tắt Edit" : "Bật Edit"}
          </button>
        </div>

        {sceneEditMode && (
          <div className="flex items-start gap-2 p-2.5 bg-[#fef3c7] border border-[#fde68a] text-[#b45309] rounded-lg text-[11px] leading-relaxed">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <strong>Chế độ Edit đang BẬT:</strong> Click chọn một đối tượng 3D trên bản đồ để kích hoạt khung điều khiển (Sketch) dùng để Kéo, Thả, Xoay, hoặc thay đổi kích thước.
            </div>
          </div>
        )}
        </div>
      )}

      {/* SECTION PLACEMENT MODE */}
      {panelMode !== "list" && placementMode && (
        <div className="border border-[#eab308] bg-[#fefce8] rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#ca8a04] font-bold text-sm">
              <MapPin size={16} />
              Ghim vị trí mô hình
            </div>
            <button
              onClick={() => dispatch(cancelPlacement())}
              className="text-[#9ca3af] hover:text-[#4b5563]"
            >
              <XCircle size={16} />
            </button>
          </div>
          
          <div className="text-[11px] text-[#854d0e]">
            {!placementPreview ? (
              <span>Click chuột vào bất kỳ vị trí nào trên bản đồ 3D để xem trước mô hình.</span>
            ) : (
              <span>Bạn có thể click lại để đổi vị trí, hoặc xoay hướng mô hình bên dưới.</span>
            )}
          </div>

          {placementPreview && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className={labelClasses}>Xoay (Heading): {Math.round(placementPreview.heading)}°</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={placementPreview.heading}
                  onChange={(e) => dispatch(updatePlacementPreview({ ...placementPreview, heading: Number(e.target.value) }))}
                  className="w-full accent-[#eab308]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className={labelClasses}>Tỉ lệ (Scale): {(placementPreview as any).scale ?? 1}</label>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="5"
                  step="0.01"
                  value={(placementPreview as any).scale ?? 1}
                  onChange={(e) => dispatch(updatePlacementPreview({ ...placementPreview, scale: Number(e.target.value) }))}
                  className="w-full accent-[#eab308]"
                />
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleConfirmPlacement}
                  disabled={confirmingPlacement}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[12px] font-bold border border-transparent rounded-lg cursor-pointer bg-[#eab308] text-white hover:bg-[#ca8a04]"
                >
                  {confirmingPlacement ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Xác nhận vị trí
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: EDITING NODE DETAILS / TRANSFORM CONTROL */}
      {panelMode !== "list" && activeEditingNode && (
        <div className="border border-[#3b82f6] bg-[#eff6ff] rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center">
            <div className="text-[13px] font-bold text-[#1d4ed8] flex items-center gap-1.5">
              <Move size={14} />
              Transform: {activeEditingNode.name}
            </div>
            <button
              onClick={() => dispatch(setSceneEditingNodeId(null))}
              className="text-[10px] text-[#64748b] hover:text-[#1e293b]"
            >
              Bỏ chọn
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Vị trí X {(activeEditingNode.lodLevel ?? 0) > 0 ? "(m)" : "(lng)"}</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformPos.x}
                onChange={(e) => setTransformPos((p) => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Vị trí Y {(activeEditingNode.lodLevel ?? 0) > 0 ? "(m)" : "(lat)"}</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformPos.y}
                onChange={(e) => setTransformPos((p) => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Vị trí Z (m)</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformPos.z}
                onChange={(e) => setTransformPos((p) => ({ ...p, z: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Xoay X (Độ)</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformRot.x}
                onChange={(e) => setTransformRot((p) => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Xoay Y (Độ)</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformRot.y}
                onChange={(e) => setTransformRot((p) => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Xoay Z (Độ)</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformRot.z}
                onChange={(e) => setTransformRot((p) => ({ ...p, z: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Tỉ lệ X</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformScale.x}
                onChange={(e) => setTransformScale((p) => ({ ...p, x: parseFloat(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Tỉ lệ Y</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformScale.y}
                onChange={(e) => setTransformScale((p) => ({ ...p, y: parseFloat(e.target.value) || 1 }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className={labelClasses}>Tỉ lệ Z</span>
              <input
                type="number"
                step="any"
                className={inputClasses}
                value={transformScale.z}
                onChange={(e) => setTransformScale((p) => ({ ...p, z: parseFloat(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveTransform}
            disabled={savingTransform}
            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-[12px] font-bold border border-transparent rounded-lg cursor-pointer bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          >
            {savingTransform ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Lưu Transform
          </button>
        </div>
      )}

      {/* SECTION 4: BASIC SCENE CRUD FORM */}
      {panelMode !== "list" && (
        <form
          onSubmit={submit}
          className="border border-[#e2e8f0] bg-white rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#1e293b] font-bold text-sm">
            <Building2 size={16} className="text-[#2563eb]" />
            {editingScene ? "Sửa scene 3D" : "Thêm scene 3D thủ công"}
          </div>
          <button
            type="button"
            onClick={() => void loadScenes()}
            className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Tên scene</label>
            <input
              className={inputClasses}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Tòa nhà A"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Scene cha</label>
            <select
              className={inputClasses}
              value={form.parentId}
              onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
            >
              <option value="">Không có</option>
              {scenes
                .filter((scene) => scene.id !== editingScene?.id && scene.lodLevel === 0)
                .map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className={labelClasses}>Mô tả</label>
            <input
              className={inputClasses}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Khối nhà, tầng, khu vực..."
            />
          </div>
          <label className="flex items-center gap-2 text-[12px] text-[#334155] h-9 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-[#2563eb]"
              checked={form.visible}
              onChange={(event) => setForm((prev) => ({ ...prev, visible: event.target.checked }))}
            />
            Hiển thị
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <label className={labelClasses}>Thứ tự sắp xếp</label>
          <input
            type="number"
            className={inputClasses + " font-mono"}
            value={form.sortOrder}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))
            }
          />
        </div>

        {error && (
          <div className="p-2 text-[11.5px] bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 py-2 px-3.5 text-[12.5px] font-semibold border border-transparent rounded-lg cursor-pointer bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
          >
            {editingScene ? <Save size={13} /> : <Plus size={13} />}
            {editingScene ? "Lưu scene" : "Thêm scene"}
          </button>
          {editingScene && (
            <button
              type="button"
              onClick={closeSceneForm}
              className="inline-flex items-center justify-center py-2 px-3.5 text-[12.5px] font-semibold border border-[#e2e8f0] rounded-lg cursor-pointer bg-white text-[#475569] hover:bg-[#f8fafc]"
            >
              Hủy
            </button>
          )}
        </div>
        </form>
      )}

      {/* SECTION 5: CÂY SCENE 3D (TREE VIEW) */}
      <div className="border border-[#e2e8f0] bg-white rounded-lg p-3.5 flex flex-col gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold text-[#1e293b] flex items-center gap-2">
            <Building2 size={16} className="text-[#2563eb]" />
            Cấu trúc Scene 3D & LOD
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void loadScenes()}
              className="w-7 h-7 inline-flex items-center justify-center rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="h-7 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] px-2.5 text-[11.5px] font-bold text-[#2563eb] hover:bg-[#dbeafe] cursor-pointer"
              title="Thêm scene"
            >
              <Plus size={13} />
              Thêm
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex items-center justify-center text-xs text-[#2563eb] gap-2">
            <Loader2 className="animate-spin" size={15} />
            Đang tải scene...
          </div>
        ) : sceneTree.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#94a3b8] bg-[#f8fafc] rounded-lg border border-dashed border-[#e2e8f0]">
            Chưa có scene 3D nào.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 select-none">
            {sceneTree.map((node) => renderTreeNode(node))}
          </div>
        )}
      </div>
    </div>
  );
};
