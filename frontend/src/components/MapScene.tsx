import { useEffect, useRef } from "react";

import esriConfig from "@arcgis/core/config";
import { useSceneLodLoader } from "../hooks/useSceneLodLoader";
import { useSceneEditor } from "../hooks/useSceneEditor";
import Graphic from "@arcgis/core/Graphic";
import { watch } from "@arcgis/core/core/reactiveUtils";
import Point from "@arcgis/core/geometry/Point";
import Polygon from "@arcgis/core/geometry/Polygon";
import Polyline from "@arcgis/core/geometry/Polyline";
import type GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";
import BuildingSceneLayer from "@arcgis/core/layers/BuildingSceneLayer";
import SceneLayer from "@arcgis/core/layers/SceneLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Extent from "@arcgis/core/geometry/Extent";
import * as geometryEngine from "@arcgis/core/geometry/geometryEngine";
import Map from "@arcgis/core/Map";

import SceneView from "@arcgis/core/views/SceneView";
import Slice from "@arcgis/core/widgets/Slice";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  clearGoToTarget,
  selectBasemapStyleId,
  selectEffectiveTerrain,
  selectGoToTarget,
  selectGroundOpacity,
  selectIndependentEntities,
  selectLayers,
  selectSelectedLayerIds,
  selectShow3DModels,
  selectShowPositioningIcons,
  selectEditorDeleteRequest,
  selectEditorExtrudeColor,
  selectEditorGroundColor,
  selectEditorModels,
  selectEditorOpen,
  selectEditorSceneLayerType,
  selectEditorSceneServiceUrl,
  selectEditorSelectedModel,
  selectEditorSliceDoorsRed,
  selectEditorSliceEnabled,
  selectEditorSliceExcludeDoors,
  selectEditorSliceTiltX,
  selectEditorSliceTiltY,
  selectEditorSliceTiltZ,
  selectEditorTool,
  selectEditorUpdateRequest,
  selectSceneEditMode,
  selectSceneEditingNodeId,
  setBasemapStyles,
  setEditorSelectedFeature,
  setEditorTool,
  setViewState,
  selectPickingCoordinateActive,
  setPickingCoordinateActive,
  setPickedCoordinate,
  selectInspectedEntity,
  setInspectedEntity,
  setSceneEditingNodeId,
  selectPlacementFileUrl,
} from "../store/mapSlice";
import { createBackendLayer } from "../layers/backendLayer";
import { loadBasemapStyles } from "../utils/basemapStyles";
import type { TerrainMode } from "../types/map";
import {
  backendHost,
  createSpatialEntity,
  deleteSpatialEntity,
  updateSpatialEntity,
  fetchSpatialEntity,
  fetchSceneById,
} from "../utils/backendApi";
import { usePlacementMode } from "../hooks/usePlacementMode";
import type { BackendLayer, BackendSpatialEntity } from "../types/backend";

const applyTerrain = (map: Map, terrain: TerrainMode) => {
  if (terrain === "flat") {
    map.ground = { layers: [] };
    return;
  }
  map.ground = terrain;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.ground.navigationConstraint = { type: "none" } as any;
};

const buildFeatureProperties = (entity: BackendSpatialEntity) => ({
  ...(entity.metadata ?? {}),
  id: entity.id,
  name: entity.name,
  type: entity.type,
  renderType: entity.renderType,
  elevation: entity.elevation ?? 0,
  height: entity.height ?? 0,
  width: entity.width ?? 1,
  color: entity.color,
  opacity: entity.opacity ?? 1,
  scaleX: entity.scaleX ?? entity.scale ?? 1,
  scaleY: entity.scaleY ?? entity.scale ?? 1,
  scaleZ: entity.scaleZ ?? entity.scale ?? 1,
  rotationX: entity.rotationX ?? 0,
  rotationY: entity.rotationY ?? 0,
  rotationZ: entity.rotationZ ?? 0,
  modelId: entity.model?.id ?? entity.modelId ?? null,
  sceneId: entity.scene?.id ?? entity.sceneId ?? null,
  modelUrl: entity.modelUrl ?? entity.model?.assetUrl ?? null,
});

const buildIndependentLayer = (entities: BackendSpatialEntity[]): BackendLayer | null => {
  const standaloneEntities = entities.filter((entity) => !entity.scene?.id && !entity.sceneId);
  if (standaloneEntities.length === 0) return null;

  return {
    id: "__independent_entities__",
    name: "Features độc lập",
    type: "Point",
    visible: true,
    minZoom: 0,
    maxZoom: 24,
    zIndex: 9999,
    elevation: 0,
    scale: 1,
    height: 0,
    modelUrl: null,
    iconUrl: null,
    dataUrl: null,
    metadata: { color: "#2563eb" },
    entities: standaloneEntities,
    featureCollection: {
      type: "FeatureCollection",
      features: standaloneEntities.map((entity) => ({
        type: "Feature",
        geometry: entity.geometry,
        properties: buildFeatureProperties(entity),
      })),
    },
    renderer: null,
    popupTemplate: {
      title: "{name}",
      content: "Feature độc lập - chưa thuộc layer dữ liệu.",
    },
    extent: null,
  };
};

const getInspectableEntityId = (attributes: Record<string, unknown> | null | undefined) => {
  if (!attributes) return null;
  if (attributes.entityId) return String(attributes.entityId);
  if (attributes.backendEntityId) return String(attributes.backendEntityId);
  if (
    attributes.type === "scene-root" ||
    attributes.type === "scene-child" ||
    attributes.type === "scene-inspect-proxy"
  ) {
    return null;
  }
  return attributes.id ? String(attributes.id) : null;
};

type EditorKind = "model" | "extrude" | "ground";

const toResolvedEditorUrl = (href: string) => {
  if (href.startsWith("http") || href.startsWith("/model/")) return href;
  return `${backendHost}${href.startsWith("/") ? "" : "/"}${href}`;
};

const modelSymbol = (href: string, size = 12, rotation = 0) => {
  return {
    type: "point-3d",
    symbolLayers: [
      {
        type: "object",
        resource: { href: toResolvedEditorUrl(href) },
        height: size,
        width: size,
        depth: size,
        heading: rotation,
        anchor: "bottom",
      },
    ],
  } as any;
};

const extrudeSymbol = (color: string, height = 15) =>
  ({
    type: "polygon-3d",
    symbolLayers: [
      {
        type: "extrude",
        size: height,
        material: { color },
        edges: {
          type: "solid",
          color: [30, 41, 59, 0.65],
          size: 1,
        },
      },
    ],
  }) as any;

const groundSymbol = (color: string) =>
  ({
    type: "polygon-3d",
    symbolLayers: [
      {
        type: "fill",
        material: { color },
        outline: {
          color: [249, 115, 22, 1],
          size: 2,
        },
      },
    ],
  }) as any;

const activeVertexSymbol = {
  type: "simple-marker",
  style: "circle",
  color: "#f97316",
  size: 9,
  outline: { color: "#ffffff", width: 1.5 },
} as any;

const makeEditorId = () => `editor-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

const polygonMetrics = (geometry: unknown) => {
  if (!(geometry instanceof Polygon)) return {};
  const area = Math.abs(geometryEngine.geodesicArea(geometry, "square-meters"));
  const ring = geometry.rings?.[0] ?? [];
  const polyline = new Polyline({
    paths: [ring],
    spatialReference: geometry.spatialReference,
  });
  const distance = geometryEngine.geodesicLength(polyline, "meters");
  let deflection: number | undefined;

  if (ring.length >= 3) {
    const a = ring[ring.length - 3];
    const b = ring[ring.length - 2];
    const c = ring[ring.length - 1];
    const angle1 = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const angle2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    deflection = Math.abs(((angle2 - angle1) * 180) / Math.PI);
    if (deflection > 180) deflection = 360 - deflection;
  }

  return {
    area: Number.isFinite(area) ? area : undefined,
    distance: Number.isFinite(distance) ? distance : undefined,
    deflection,
  };
};

const editorFeatureFromGraphic = (graphic: Graphic) => {
  const kind = graphic.attributes?.editorKind as EditorKind | undefined;
  if (!kind) return null;
  syncGraphicTransformAttributes(graphic);
  const metrics = polygonMetrics(graphic.geometry);
  return {
    id: String(graphic.attributes.editorId),
    kind,
    name: graphic.attributes.name ?? "3D object",
    modelType: graphic.attributes.modelType,
    size: graphic.attributes.size ?? 12,
    rotation: graphic.attributes.rotation ?? 0,
    height: graphic.attributes.height ?? 15,
    color: graphic.attributes.color ?? "#38bdf8",
    elevation: graphic.geometry && "z" in graphic.geometry ? (graphic.geometry as Point).z ?? 0 : 0,
    ...metrics,
  };
};

const syncGraphicTransformAttributes = (graphic: Graphic) => {
  if (graphic.attributes?.editorKind !== "model") return;
  const symbolLayer = (graphic.symbol as any)?.symbolLayers?.getItemAt?.(0)
    ?? (graphic.symbol as any)?.symbolLayers?.[0];
  if (!symbolLayer) return;
  const height = Number(symbolLayer.height ?? symbolLayer.size);
  const heading = Number(symbolLayer.heading ?? symbolLayer.rotation);
  if (Number.isFinite(height)) {
    graphic.attributes.size = height;
  }
  if (Number.isFinite(heading)) {
    graphic.attributes.rotation = heading;
  }
};

const applyEditorSymbol = (graphic: Graphic) => {
  const kind = graphic.attributes?.editorKind as EditorKind | undefined;
  if (kind === "model") {
    graphic.symbol = modelSymbol(
      graphic.attributes.modelUrl ?? "",
      graphic.attributes.size ?? 12,
      graphic.attributes.rotation ?? 0,
    );
  }
  if (kind === "extrude") {
    graphic.symbol = extrudeSymbol(
      graphic.attributes.color ?? "#38bdf8",
      graphic.attributes.height ?? 15,
    );
  }
  if (kind === "ground") {
    graphic.symbol = groundSymbol(graphic.attributes.color ?? "#f97316");
  }
};

const persistEditorGraphic = async (graphic: Graphic) => {
  const backendEntityId = graphic.attributes?.backendEntityId as string | null | undefined;
  if (!backendEntityId || graphic.attributes?.editorKind !== "model") return;
  syncGraphicTransformAttributes(graphic);
  const point = graphic.geometry instanceof Point ? graphic.geometry : null;
  if (!point) return;

  await updateSpatialEntity(backendEntityId, {
    geometry: {
      type: "Point",
      coordinates: [point.longitude, point.latitude],
    },
    elevation: point.z ?? 0,
    scaleX: graphic.attributes.size ?? 12,
    scaleY: graphic.attributes.size ?? 12,
    scaleZ: graphic.attributes.size ?? 12,
    rotationZ: graphic.attributes.rotation ?? 0,
  });
};

const MapScene = () => {
  const dispatch = useAppDispatch();

  const terrain = useAppSelector(selectEffectiveTerrain);
  const basemapStyleId = useAppSelector(selectBasemapStyleId);
  const groundOpacity = useAppSelector(selectGroundOpacity);
  const layers = useAppSelector(selectLayers);
  const independentEntities = useAppSelector(selectIndependentEntities);
  const selectedLayerIds = useAppSelector(selectSelectedLayerIds);
  const goToTarget = useAppSelector(selectGoToTarget);
  const show3DModels = useAppSelector(selectShow3DModels);
  const showPositioningIcons = useAppSelector(selectShowPositioningIcons);
  const pickingCoordinateActive = useAppSelector(selectPickingCoordinateActive);
  const editorOpen = useAppSelector(selectEditorOpen);
  const editorTool = useAppSelector(selectEditorTool);
  const editorSelectedModel = useAppSelector(selectEditorSelectedModel);
  const editorModels = useAppSelector(selectEditorModels);
  const editorExtrudeColor = useAppSelector(selectEditorExtrudeColor);
  const editorGroundColor = useAppSelector(selectEditorGroundColor);
  const editorSceneServiceUrl = useAppSelector(selectEditorSceneServiceUrl);
  const editorSceneLayerType = useAppSelector(selectEditorSceneLayerType);
  const editorSliceEnabled = useAppSelector(selectEditorSliceEnabled);
  const editorSliceExcludeDoors = useAppSelector(selectEditorSliceExcludeDoors);
  const editorSliceDoorsRed = useAppSelector(selectEditorSliceDoorsRed);
  const editorSliceTiltX = useAppSelector(selectEditorSliceTiltX);
  const editorSliceTiltY = useAppSelector(selectEditorSliceTiltY);
  const editorSliceTiltZ = useAppSelector(selectEditorSliceTiltZ);
  const editorUpdateRequest = useAppSelector(selectEditorUpdateRequest);
  const editorDeleteRequest = useAppSelector(selectEditorDeleteRequest);
  const sceneEditMode = useAppSelector(selectSceneEditMode);
  const sceneEditingNodeId = useAppSelector(selectSceneEditingNodeId);
  const inspectedEntity = useAppSelector(selectInspectedEntity);
  const placementFileUrl = useAppSelector(selectPlacementFileUrl);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const viewRef = useRef<SceneView | null>(null);
  const hasApiKeyRef = useRef(false);
  const dataLayersRef = useRef<GeoJSONLayer[]>([]);
  const dataLayerBlobUrlsRef = useRef<string[]>([]);
  const editorModelLayerRef = useRef<GraphicsLayer | null>(null);
  const editorExtrudeLayerRef = useRef<GraphicsLayer | null>(null);
  const editorGroundLayerRef = useRef<GraphicsLayer | null>(null);
  const sketchViewModelRef = useRef<SketchViewModel | null>(null);
  const selectedEditorGraphicRef = useRef<Graphic | null>(null);
  const sceneServiceLayerRef = useRef<BuildingSceneLayer | SceneLayer | null>(null);
  const sliceWidgetRef = useRef<Slice | null>(null);
  const doorsSublayerRef = useRef<any>(null);
  const sceneLodLayerRef = useRef<GraphicsLayer | null>(null);

  const { reloadScenes } = useSceneLodLoader(viewRef, sceneLodLayerRef);

  useSceneEditor(viewRef, sceneLodLayerRef, () => {
    void reloadScenes();
  });

  // Tích hợp Placement Mode hook (cho phép ghim mô hình)
  usePlacementMode(viewRef, sceneLodLayerRef, placementFileUrl);

  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = import.meta.env.VITE_ARCGIS_API_KEY as string | undefined;
    const hasApiKey = Boolean(apiKey);
    hasApiKeyRef.current = hasApiKey;

    if (apiKey) {
      esriConfig.apiKey = apiKey;
    }

    const map = new Map({
      basemap: hasApiKey ? basemapStyleId : "osm",
    });
    applyTerrain(map, terrain);

    const checkBasemap = (bm: any) => {
      if (bm) {
        bm.when().catch((err: any) => {
          console.warn("Failed to load basemap, falling back to OSM:", err);
          map.basemap = "osm" as any;
        });
      }
    };

    const basemapHandle = watch(() => map.basemap, checkBasemap);
    checkBasemap(map.basemap);

    const view = new SceneView({
      container: mapRef.current,
      map,
      center: [105.78, 10.04],
      zoom: 12,
    });
    view.popupEnabled = true;

    view
      .when(() => {
        const camera = view.camera.clone();
        camera.tilt = 60;
        return view.goTo(camera, { animate: false });
      })
      .catch(() => undefined);

    mapInstanceRef.current = map;
    viewRef.current = view;

    const editorGroundLayer = new GraphicsLayer({
      title: "Editor ground polygons",
      elevationInfo: { mode: "on-the-ground" },
      listMode: "hide",
    } as any);
    const editorExtrudeLayer = new GraphicsLayer({
      title: "Editor extruded blocks",
      elevationInfo: { mode: "relative-to-ground" },
      listMode: "hide",
    } as any);
    const editorModelLayer = new GraphicsLayer({
      title: "Editor 3D models",
      elevationInfo: { mode: "absolute-height" },
      listMode: "hide",
    } as any);
    const sceneLodLayer = new GraphicsLayer({
      title: "Scene 3D models (LOD)",
      elevationInfo: { mode: "absolute-height" },
      listMode: "hide",
    } as any);
    map.addMany([editorGroundLayer, editorExtrudeLayer, editorModelLayer, sceneLodLayer]);

    editorGroundLayerRef.current = editorGroundLayer;
    editorExtrudeLayerRef.current = editorExtrudeLayer;
    editorModelLayerRef.current = editorModelLayer;
    sceneLodLayerRef.current = sceneLodLayer;

    const sketchViewModel = new SketchViewModel({
      view,
      layer: editorModelLayer,
      updateOnGraphicClick: true,
      tooltipOptions: { enabled: true },
      labelOptions: { enabled: true },
      snappingOptions: {
        enabled: true,
        selfEnabled: true,
        featureEnabled: true,
      },
      defaultUpdateOptions: {
        tool: "transform",
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        preserveAspectRatio: false,
        multipleSelectionEnabled: false,
      },
      vertexSymbol: activeVertexSymbol,
      activeVertexSymbol,
      polygonSymbol: groundSymbol("#f97316"),
    } as any);
    sketchViewModelRef.current = sketchViewModel;

    const selectEditorGraphic = (graphic: Graphic | null) => {
      selectedEditorGraphicRef.current = graphic;
      dispatch(setEditorSelectedFeature(graphic ? editorFeatureFromGraphic(graphic) : null));
    };

    const sketchCreateHandle = sketchViewModel.on("create", (event) => {
      if (event.state !== "complete" || !event.graphic) return;
      const graphic = event.graphic;
      if (!graphic.attributes?.editorId) {
        graphic.attributes = {
          ...(graphic.attributes ?? {}),
          editorId: makeEditorId(),
        };
      }
      applyEditorSymbol(graphic);
      selectEditorGraphic(graphic);
      void sketchViewModel.update([graphic], {
        tool: "transform",
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        preserveAspectRatio: false,
      } as any);
    });

    const sketchUpdateHandle = sketchViewModel.on("update", (event) => {
      const graphic = event.graphics?.[0];
      if (!graphic) return;
      syncGraphicTransformAttributes(graphic);
      selectEditorGraphic(graphic);
      if (event.state === "complete") {
        void persistEditorGraphic(graphic).catch((err) => {
          console.error("Failed to persist transformed model:", err);
        });
      }
    });

    const sketchDeleteHandle = sketchViewModel.on("delete", () => {
      selectEditorGraphic(null);
    });

    const controller = new AbortController();
    let isMounted = true;

    const updateViewState = () => {
      const center = view.center;
      if (!center || !isMounted) return;
      if (
        center.longitude == null ||
        center.latitude == null ||
        view.zoom == null ||
        view.scale == null
      )
        return;

      dispatch(
        setViewState({
          longitude: center.longitude,
          latitude: center.latitude,
          zoom: view.zoom,
          scale: view.scale,
        }),
      );
    };

    const viewStateHandle = watch(
      () => [view.center, view.zoom, view.scale],
      updateViewState,
    );
    updateViewState();

    const loadStyles = async () => {
      if (hasApiKey) {
        const styleList = await loadBasemapStyles(controller.signal);
        if (isMounted) dispatch(setBasemapStyles(styleList));
      } else if (isMounted) {
        dispatch(setBasemapStyles([]));
      }
    };

    loadStyles().catch(() => undefined);

    return () => {
      isMounted = false;
      controller.abort();
      dataLayerBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      dataLayerBlobUrlsRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.removeMany(dataLayersRef.current);
        if (sceneServiceLayerRef.current) {
          mapInstanceRef.current.remove(sceneServiceLayerRef.current);
        }
        mapInstanceRef.current.removeMany([
          editorGroundLayer,
          editorExtrudeLayer,
          editorModelLayer,
          sceneLodLayer,
        ]);
      }
      dataLayersRef.current = [];
      sketchCreateHandle.remove();
      sketchUpdateHandle.remove();
      sketchDeleteHandle.remove();
      sketchViewModel.destroy();
      sketchViewModelRef.current = null;
      selectedEditorGraphicRef.current = null;
      editorGroundLayerRef.current = null;
      editorExtrudeLayerRef.current = null;
      editorModelLayerRef.current = null;
      sceneLodLayerRef.current = null;
      if (sliceWidgetRef.current) {
        view.ui.remove(sliceWidgetRef.current);
        sliceWidgetRef.current.destroy();
        sliceWidgetRef.current = null;
      }
      sceneServiceLayerRef.current = null;
      doorsSublayerRef.current = null;
      basemapHandle.remove();
      viewStateHandle.remove();
      viewRef.current = null;
      mapInstanceRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    applyTerrain(map, terrain);
  }, [terrain]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || terrain === "flat") return;
    map.ground.opacity = groundOpacity;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.ground.navigationConstraint = { type: "none" } as any;
  }, [groundOpacity, terrain]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasApiKeyRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.basemap = basemapStyleId as any;
  }, [basemapStyleId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (sceneServiceLayerRef.current) {
      map.remove(sceneServiceLayerRef.current);
      sceneServiceLayerRef.current = null;
      doorsSublayerRef.current = null;
    }

    if (!editorSceneServiceUrl) return;

    const layer =
      editorSceneLayerType === "building"
        ? new BuildingSceneLayer({
            url: editorSceneServiceUrl,
            title: "Uploaded Building Scene",
          })
        : new SceneLayer({
            url: editorSceneServiceUrl,
            title: "Uploaded Scene Layer",
          });

    sceneServiceLayerRef.current = layer;
    map.add(layer);

    if (editorSceneLayerType === "building") {
      layer.when(() => {
        const buildingLayer = layer as BuildingSceneLayer;
        buildingLayer.allSublayers.forEach((sublayer: any) => {
          if (sublayer.modelName === "FullModel") {
            sublayer.visible = true;
          } else if (sublayer.modelName === "Overview" || sublayer.modelName === "Rooms") {
            sublayer.visible = false;
          } else {
            sublayer.visible = true;
          }
          if (sublayer.modelName === "Doors") {
            doorsSublayerRef.current = sublayer;
          }
        });
      }).catch((err) => {
        console.error("Failed to load BuildingSceneLayer:", err);
      });
    }

    return () => {
      if (sceneServiceLayerRef.current === layer) {
        map.remove(layer);
        sceneServiceLayerRef.current = null;
        doorsSublayerRef.current = null;
      }
    };
  }, [editorSceneServiceUrl, editorSceneLayerType]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    if (!sliceWidgetRef.current) {
      sliceWidgetRef.current = new Slice({
        view,
        visible: false,
      });
      view.ui.add(sliceWidgetRef.current, "top-right");
    }

    sliceWidgetRef.current.visible = editorSliceEnabled;
  }, [editorSliceEnabled]);

  // Sync Slice Plane Rotations (Tilt, Heading)
  useEffect(() => {
    const sliceWidget = sliceWidgetRef.current;
    if (!sliceWidget || !sliceWidget.viewModel.shape) return;
    
    // @ts-ignore - Ignore ArcGIS type limitations, tilt and heading are supported for Plane
    sliceWidget.viewModel.shape.tilt = editorSliceTiltX;
    // @ts-ignore
    sliceWidget.viewModel.shape.heading = editorSliceTiltY;
    // Note: ArcGIS JS API Slice Plane không trực tiếp support "roll" (Z axis) bằng thuộc tính public trên shape, 
    // cần áp dụng ma trận biến đổi (matrix transform) nếu API cho phép, hoặc xoay camera/geometry
    // Ở bản nâng cấp này, Y, X đã map vào heading, tilt. Chiều Z (Roll) cần workaround hoặc dùng thư viện phụ trợ.
    
  }, [editorSliceTiltX, editorSliceTiltY, editorSliceTiltZ]);

  useEffect(() => {
    const sliceWidget = sliceWidgetRef.current;
    if (!sliceWidget) return;
    sliceWidget.viewModel.excludedLayers.removeAll();
    if (editorSliceExcludeDoors && doorsSublayerRef.current) {
      sliceWidget.viewModel.excludedLayers.add(doorsSublayerRef.current);
    }
  }, [editorSliceExcludeDoors, editorSceneServiceUrl, editorSliceEnabled]);

  useEffect(() => {
    const doorsLayer = doorsSublayerRef.current;
    if (!doorsLayer) return;
    doorsLayer.renderer = editorSliceDoorsRed
      ? {
          type: "simple",
          symbol: {
            type: "mesh-3d",
            symbolLayers: [
              {
                type: "fill",
                material: { color: "red" },
              },
            ],
          },
        }
      : null;
  }, [editorSliceDoorsRed, editorSceneServiceUrl]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const view = viewRef.current;
    if (!map || !view) return;

    const selectedIds = new Set(selectedLayerIds);
    const independentLayer = buildIndependentLayer(independentEntities);
    const nextLayers = layers
      .filter((layer) => selectedIds.has(layer.id))
      .sort((a, b) => a.zIndex - b.zIndex);
    const renderLayers = independentLayer ? [...nextLayers, independentLayer] : nextLayers;

    const currentLayers: GeoJSONLayer[] = [];
    const currentBlobs: string[] = [];

    if (renderLayers.length > 0) {
      const created = renderLayers.map((layer) =>
        createBackendLayer(layer, show3DModels, showPositioningIcons),
      );
      created.forEach(({ layers, blobUrls }) => {
        map.addMany(layers);
        currentLayers.push(...layers);
        currentBlobs.push(...blobUrls);
      });
    }

    let active = true;
    const updateExtent = () => {
      if (!active || currentLayers.length === 0) return;
      const extents = nextLayers
        .map((layer) => layer.extent)
        .filter((extent): extent is NonNullable<typeof extent> =>
          Boolean(extent),
        );

      if (extents.length === 0) return;

      const merged = extents.reduce((acc, curr) => ({
        xmin: Math.min(acc.xmin, curr.xmin),
        ymin: Math.min(acc.ymin, curr.ymin),
        xmax: Math.max(acc.xmax, curr.xmax),
        ymax: Math.max(acc.ymax, curr.ymax),
      }));

      const extentGeometry = new Extent({
        xmin: merged.xmin,
        ymin: merged.ymin,
        xmax: merged.xmax,
        ymax: merged.ymax,
        spatialReference: { wkid: 4326 },
      });

      void view.goTo(extentGeometry.expand(1.2)).catch(() => undefined);
    };

    updateExtent();

    const handle = watch(() => view.zoom, () => {
      if (!active) return;
      const zoom = view.zoom;
      if (zoom == null) return;
      
      const isNear = zoom >= 17;
      
      currentLayers.forEach((layer) => {
        if (layer.title === "Features độc lập") {
          // Khi GẦN (zoom >= 17): hiện tất cả feature (kể cả con của scene)
          // Khi XA (zoom < 17): chỉ hiện những feature KHÔNG thuộc scene (vì lúc này vỏ tòa nhà LOD 0 đang hiển thị)
          layer.definitionExpression = isNear ? "1=1" : "sceneId IS NULL";
        }
      });
    });
    
    // Initial apply
    if (view.zoom != null) {
      const isNear = view.zoom >= 17;
      currentLayers.forEach((layer) => {
        if (layer.title === "Features độc lập") {
          layer.definitionExpression = isNear ? "1=1" : "sceneId IS NULL";
        }
      });
    }

    return () => {
      active = false;
      handle.remove();
      if (currentLayers.length > 0) {
        map.removeMany(currentLayers);
      }
      if (currentBlobs.length > 0) {
        // Delay blob revocation to prevent ERR_FILE_NOT_FOUND if ArcGIS is still fetching
        setTimeout(() => {
          currentBlobs.forEach((url) => URL.revokeObjectURL(url));
        }, 5000);
      }
    };
  }, [layers, independentEntities, selectedLayerIds, show3DModels, showPositioningIcons]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !goToTarget) return;

    const point = new Point({
      longitude: goToTarget.longitude,
      latitude: goToTarget.latitude,
    });

    view
      .goTo(
        {
          target: point,
          zoom: goToTarget.zoom ?? 18,
          tilt: 60,
        },
        { duration: 1500, easing: "ease-in-out" },
      )
      .then(() => dispatch(clearGoToTarget()))
      .catch(() => undefined);
  }, [goToTarget, dispatch]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !pickingCoordinateActive) return;

    const container = view.container;
    if (!container) return;

    const originalCursor = container.style.cursor;
    container.style.cursor = "crosshair";

    const originalPopupEnabled = view.popupEnabled;
    view.popupEnabled = false;

    const clickHandle = view.on("click", (event) => {
      event.stopPropagation();
      const mapPoint = view.toMap({ x: event.x, y: event.y });
      if (mapPoint) {
        dispatch(
          setPickedCoordinate({
            longitude: mapPoint.longitude,
            latitude: mapPoint.latitude,
            elevation: mapPoint.z || 0,
          })
        );
        dispatch(setPickingCoordinateActive(false));
      }
    });

    return () => {
      container.style.cursor = originalCursor;
      view.popupEnabled = originalPopupEnabled;
      clickHandle.remove();
    };
  }, [pickingCoordinateActive, dispatch]);

  useEffect(() => {
    const sketchViewModel = sketchViewModelRef.current;
    if (!sketchViewModel) return;

    if (!editorOpen) {
      sketchViewModel.cancel();
      selectedEditorGraphicRef.current = null;
      dispatch(setEditorSelectedFeature(null));
    }
  }, [editorOpen, dispatch]);

  useEffect(() => {
    const view = viewRef.current;
    const sketchViewModel = sketchViewModelRef.current;
    const modelLayer = editorModelLayerRef.current;
    if (!view || !sketchViewModel || !modelLayer || !editorOpen) return;
    if (editorTool !== "place-model") return;

    sketchViewModel.cancel();
    const container = view.container;
    const originalCursor = container?.style.cursor ?? "";
    if (container) container.style.cursor = "crosshair";

    const clickHandle = view.on("click", (event) => {
      event.stopPropagation();
      const point = view.toMap({ x: event.x, y: event.y });
      if (!point) return;

      const model = editorModels.find((item) => item.id === editorSelectedModel);
      if (!model?.assetUrl) return;
      const graphic = new Graphic({
        geometry: new Point({
          longitude: point.longitude,
          latitude: point.latitude,
          z: point.z ?? 0,
          spatialReference: point.spatialReference,
        }),
        attributes: {
          editorId: makeEditorId(),
          editorKind: "model",
          name: model.name,
          modelType: model.id,
          modelUrl: model.assetUrl,
          backendEntityId: null,
          size: 12,
          rotation: 0,
          color: "#ffffff",
        },
        symbol: modelSymbol(model.assetUrl, 12, 0),
      });

      modelLayer.add(graphic);
      selectedEditorGraphicRef.current = graphic;
      dispatch(setEditorSelectedFeature(editorFeatureFromGraphic(graphic)));
      dispatch(setEditorTool("select"));
      void sketchViewModel.update([graphic], {
        tool: "transform",
        enableRotation: true,
        enableScaling: true,
        enableZ: true,
        preserveAspectRatio: false,
      } as any);
      void createSpatialEntity({
        layerId: null,
        modelId: model.id,
        name: model.name,
        type: "Point",
        renderType: "glb",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        elevation: point.z ?? 0,
        scaleX: 12,
        scaleY: 12,
        scaleZ: 12,
        rotationZ: 0,
        modelUrl: model.assetUrl,
        metadata: {
          editorCreated: true,
        },
      }).then((entity) => {
        graphic.attributes = {
          ...(graphic.attributes ?? {}),
          backendEntityId: entity.id,
        };
      }).catch((err) => {
        console.error("Failed to persist placed model:", err);
      });
    });

    return () => {
      if (container) container.style.cursor = originalCursor;
      clickHandle.remove();
    };
  }, [editorOpen, editorTool, editorSelectedModel, editorModels, dispatch]);

  useEffect(() => {
    const sketchViewModel = sketchViewModelRef.current;
    const extrudeLayer = editorExtrudeLayerRef.current;
    const groundLayer = editorGroundLayerRef.current;
    if (!sketchViewModel || !editorOpen) return;

    if (editorTool === "draw-extrude" && extrudeLayer) {
      sketchViewModel.cancel();
      sketchViewModel.layer = extrudeLayer;
      sketchViewModel.polygonSymbol = extrudeSymbol(editorExtrudeColor, 15);
      void sketchViewModel.create("polygon", {
        mode: "click",
        graphicProperties: {
          attributes: {
            editorId: makeEditorId(),
            editorKind: "extrude",
            name: "Extruded block",
            height: 15,
            color: editorExtrudeColor,
          },
          symbol: extrudeSymbol(editorExtrudeColor, 15),
        },
      } as any);
      dispatch(setEditorTool("select"));
    }

    if (editorTool === "draw-ground" && groundLayer) {
      sketchViewModel.cancel();
      sketchViewModel.layer = groundLayer;
      sketchViewModel.polygonSymbol = groundSymbol(editorGroundColor);
      void sketchViewModel.create("polygon", {
        mode: "click",
        graphicProperties: {
          attributes: {
            editorId: makeEditorId(),
            editorKind: "ground",
            name: "Ground area",
            height: 0,
            color: editorGroundColor,
          },
          symbol: groundSymbol(editorGroundColor),
        },
      } as any);
      dispatch(setEditorTool("select"));
    }
  }, [editorOpen, editorTool, editorExtrudeColor, editorGroundColor, dispatch]);

  useEffect(() => {
    if (!editorUpdateRequest) return;
    const graphic = selectedEditorGraphicRef.current;
    if (!graphic) return;

    graphic.attributes = {
      ...(graphic.attributes ?? {}),
      ...editorUpdateRequest.values,
    };
    applyEditorSymbol(graphic);
    dispatch(setEditorSelectedFeature(editorFeatureFromGraphic(graphic)));
    void persistEditorGraphic(graphic).catch((err) => {
      console.error("Failed to persist editor update:", err);
    });
  }, [editorUpdateRequest, dispatch]);

  useEffect(() => {
    if (!editorDeleteRequest) return;
    const sketchViewModel = sketchViewModelRef.current;
    const graphic = selectedEditorGraphicRef.current;
    if (!graphic) return;
    const backendEntityId = graphic.attributes?.backendEntityId as string | null | undefined;

    sketchViewModel?.cancel();
    editorModelLayerRef.current?.remove(graphic);
    editorExtrudeLayerRef.current?.remove(graphic);
    editorGroundLayerRef.current?.remove(graphic);
    selectedEditorGraphicRef.current = null;
    dispatch(setEditorSelectedFeature(null));
    if (backendEntityId) {
      void deleteSpatialEntity(backendEntityId).catch((err) => {
        console.error("Failed to delete persisted model:", err);
      });
    }
  }, [editorDeleteRequest, dispatch]);

  // Entity Inspection: click on map to inspect entity details
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const clickHandle = view.on("click", async (event) => {
      // Skip if other modes are active
      if (pickingCoordinateActive) return;
      if (sceneEditMode) return;
      if (editorOpen && editorTool === "place-model") return;

      try {
        const hitResponse = await view.hitTest(event);
        const results = hitResponse.results ?? [];

        let entityId: string | null = null;
        let clickedSceneGraphic: Graphic | null = null;
        for (const result of results) {
          if (result.type !== "graphic") continue;
          entityId = getInspectableEntityId(result.graphic?.attributes);
          if (entityId) break;
          const attrs = result.graphic?.attributes;
          if (attrs && (attrs.type === "scene-child" || attrs.type === "scene-root")) {
            clickedSceneGraphic = result.graphic;
            break;
          }
        }

        if (entityId) {
          try {
            const entity = await fetchSpatialEntity(entityId);
            dispatch(setInspectedEntity(entity));
            dispatch(setSceneEditingNodeId(entity.scene?.id || entity.sceneId || null));
          } catch {
            // Entity not found in backend (could be editor graphic), clear
            dispatch(setInspectedEntity(null));
            dispatch(setSceneEditingNodeId(null));
          }
        } else if (clickedSceneGraphic) {
          try {
            const sceneId = clickedSceneGraphic.attributes.id;
            const scene = await fetchSceneById(sceneId);
            const point = clickedSceneGraphic.geometry as Point;
            const virtualEntity: BackendSpatialEntity = {
              id: scene.id,
              name: scene.name,
              type: "scene_node",
              renderType: "3d_model",
              geometry: {
                type: "Point",
                coordinates: [point.longitude, point.latitude],
              },
              elevation: point.z ?? 0,
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
              sceneId: scene.id,
              scene: scene,
              images: [],
            };
            dispatch(setInspectedEntity(virtualEntity));
            dispatch(setSceneEditingNodeId(scene.id));
          } catch (err) {
            console.error("Failed to inspect scene child:", err);
            dispatch(setInspectedEntity(null));
            dispatch(setSceneEditingNodeId(null));
          }
        } else {
          dispatch(setInspectedEntity(null));
          dispatch(setSceneEditingNodeId(null));
        }
      } catch {
        // hitTest failed, ignore
      }
    });

    return () => {
      clickHandle.remove();
    };
  }, [pickingCoordinateActive, sceneEditMode, editorOpen, editorTool, dispatch]);

  // Tự động bao viền xanh (highlight) cho đối tượng 3D được chọn
  useEffect(() => {
    const view = viewRef.current;
    const sceneLodLayer = sceneLodLayerRef.current;
    if (!view || !sceneLodLayer) return;

    let highlightHandle: { remove: () => void } | null = null;

    const findAndHighlight = async () => {
      if (highlightHandle) {
        highlightHandle.remove();
        highlightHandle = null;
      }

      const targetId = inspectedEntity?.id || inspectedEntity?.sceneId || sceneEditingNodeId;
      if (!targetId) return;

      let targetGraphic = sceneLodLayer.graphics.find(
        (g) => g.attributes?.id === targetId || g.attributes?.entityId === targetId
      );

      if (!targetGraphic && editorModelLayerRef.current) {
        targetGraphic = editorModelLayerRef.current.graphics.find(
          (g) => g.attributes?.backendEntityId === targetId || g.attributes?.editorId === targetId
        );
      }

      if (targetGraphic) {
        const layer = targetGraphic.layer as GraphicsLayer;
        try {
          const layerView = await view.whenLayerView(layer);
          // @ts-ignore
          highlightHandle = layerView.highlight(targetGraphic);
        } catch (err) {
          console.warn("Failed to highlight graphic:", err);
        }
      }
    };

    void findAndHighlight();

    // Lắng nghe khi graphics được thêm/xóa để cập nhật highlight
    const collectionHandle = sceneLodLayer.graphics.on("change", () => {
      void findAndHighlight();
    });

    return () => {
      if (highlightHandle) {
        highlightHandle.remove();
      }
      collectionHandle.remove();
    };
  }, [inspectedEntity, sceneEditingNodeId]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default MapScene;
