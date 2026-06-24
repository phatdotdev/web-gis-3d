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
  selectEditorSliceHeading,
  selectEditorSliceTilt,
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
  selectSceneLodLevelsBySceneId,
  selectActiveLodLevel,
} from "../store/mapSlice";
import {
  createBackendLayer,
  getMapPinIcon,
  MODEL_DETAIL_SCALE,
} from "../layers/backendLayer";
import { getEntityCenter } from "../utils/geometry";
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
import type { BackendSpatialEntity } from "../types/backend";

const applyTerrain = (map: Map, terrain: TerrainMode) => {
  if (terrain === "flat") {
    map.ground = { layers: [] };
    return;
  }
  map.ground = terrain;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.ground.navigationConstraint = { type: "none" } as any;
};

const getInspectableEntityId = (
  attributes: Record<string, unknown> | null | undefined,
) => {
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

const toBackendUrl = (href: string) => {
  if (href.startsWith("http")) return href;
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

const getEntityModelUrl = (entity: BackendSpatialEntity) =>
  entity.modelUrl || entity.assetUrl || entity.model?.assetUrl || null;

const getEntityModelSize = (entity: BackendSpatialEntity) => {
  const size = Number(entity.scaleX ?? entity.scale ?? entity.height ?? 12);
  return Number.isFinite(size) && size > 0 ? size : 12;
};

const isSceneBackedEntity = (entity: BackendSpatialEntity) =>
  Boolean(
    entity.scene ||
    entity.sceneId ||
    entity.type === "scene_component" ||
    entity.metadata?.sceneNodeId ||
    entity.metadata?.parentSceneId,
  );

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

const applySliceRotation = (
  sliceWidget: Slice | null,
  heading: number,
  tilt: number,
) => {
  const shape = sliceWidget?.viewModel.shape as any;
  if (!sliceWidget || !shape) return;
  sliceWidget.viewModel.tiltEnabled = true;
  shape.heading = ((heading % 360) + 360) % 360;
  shape.tilt = Math.max(0, Math.min(180, tilt));
  sliceWidget.viewModel.shape = shape;
};

const makeEditorId = () =>
  `editor-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

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
    elevation:
      graphic.geometry && "z" in graphic.geometry
        ? ((graphic.geometry as Point).z ?? 0)
        : 0,
    ...metrics,
  };
};

const syncGraphicTransformAttributes = (graphic: Graphic) => {
  if (graphic.attributes?.editorKind !== "model") return;
  const symbolLayer =
    (graphic.symbol as any)?.symbolLayers?.getItemAt?.(0) ??
    (graphic.symbol as any)?.symbolLayers?.[0];
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
  const backendEntityId = graphic.attributes?.backendEntityId as
    | string
    | null
    | undefined;
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
  const editorSliceHeading = useAppSelector(selectEditorSliceHeading);
  const editorSliceTilt = useAppSelector(selectEditorSliceTilt);
  const editorUpdateRequest = useAppSelector(selectEditorUpdateRequest);
  const editorDeleteRequest = useAppSelector(selectEditorDeleteRequest);
  const sceneEditMode = useAppSelector(selectSceneEditMode);
  const sceneEditingNodeId = useAppSelector(selectSceneEditingNodeId);
  const inspectedEntity = useAppSelector(selectInspectedEntity);
  const placementFileUrl = useAppSelector(selectPlacementFileUrl);
  const sceneLodLevelsBySceneId = useAppSelector(selectSceneLodLevelsBySceneId);
  const activeSceneLodLevel = useAppSelector(selectActiveLodLevel);

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
  const sceneServiceLayerRef = useRef<BuildingSceneLayer | SceneLayer | null>(
    null,
  );
  const sliceWidgetRef = useRef<Slice | null>(null);
  const doorsSublayerRef = useRef<any>(null);
  const sceneLodLayerRef = useRef<GraphicsLayer | null>(null);
  const positioningPinsLayerRef = useRef<GraphicsLayer | null>(null);
  const independentModelLayerRef = useRef<GraphicsLayer | null>(null);

  const { rootScenes, reloadScenes } = useSceneLodLoader(
    viewRef,
    sceneLodLayerRef,
  );

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
    // @ts-ignore
    view.highlightOptions = {
      color: [0, 255, 255, 1],
      haloOpacity: 0.9,
      fillOpacity: 0.2,
    };
    view.popupEnabled = false;

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
    const positioningPinsLayer = new GraphicsLayer({
      title: "Positioning pins for independent entities & scenes",
      elevationInfo: { mode: "relative-to-ground" },
      maxScale: MODEL_DETAIL_SCALE,
      listMode: "hide",
    } as any);
    const independentModelLayer = new GraphicsLayer({
      title: "Independent spatial entity 3D models",
      elevationInfo: { mode: "relative-to-ground" },
      minScale: MODEL_DETAIL_SCALE,
      listMode: "hide",
    } as any);
    map.addMany([
      editorGroundLayer,
      editorExtrudeLayer,
      editorModelLayer,
      sceneLodLayer,
      positioningPinsLayer,
      independentModelLayer,
    ]);

    editorGroundLayerRef.current = editorGroundLayer;
    editorExtrudeLayerRef.current = editorExtrudeLayer;
    editorModelLayerRef.current = editorModelLayer;
    sceneLodLayerRef.current = sceneLodLayer;
    positioningPinsLayerRef.current = positioningPinsLayer;
    independentModelLayerRef.current = independentModelLayer;

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
      dispatch(
        setEditorSelectedFeature(
          graphic ? editorFeatureFromGraphic(graphic) : null,
        ),
      );
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
          positioningPinsLayer,
          independentModelLayer,
        ]);
      }
      positioningPinsLayerRef.current = null;
      independentModelLayerRef.current = null;
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
      layer
        .when(() => {
          const buildingLayer = layer as BuildingSceneLayer;
          buildingLayer.allSublayers.forEach((sublayer: any) => {
            if (sublayer.modelName === "FullModel") {
              sublayer.visible = true;
            } else if (
              sublayer.modelName === "Overview" ||
              sublayer.modelName === "Rooms"
            ) {
              sublayer.visible = false;
            } else {
              sublayer.visible = true;
            }
            if (sublayer.modelName === "Doors") {
              doorsSublayerRef.current = sublayer;
            }
          });
        })
        .catch((err) => {
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
      sliceWidgetRef.current.viewModel.tiltEnabled = true;
      view.ui.add(sliceWidgetRef.current, "top-right");
    }

    const sliceWidget = sliceWidgetRef.current;

    if (editorSliceEnabled) {
      sliceWidget.visible = true;
      sliceWidget.viewModel.tiltEnabled = true;
      void sliceWidget.viewModel
        .start()
        .then(() => {
          applySliceRotation(sliceWidget, editorSliceHeading, editorSliceTilt);
        })
        .catch((err) => {
          console.error("Failed to start slice placement:", err);
        });
    } else {
      sliceWidget.visible = false;
      sliceWidget.viewModel.clear();
    }
  }, [editorSliceEnabled]);

  useEffect(() => {
    applySliceRotation(
      sliceWidgetRef.current,
      editorSliceHeading,
      editorSliceTilt,
    );
  }, [editorSliceHeading, editorSliceTilt]);

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
    const renderLayers = layers
      .filter((layer) => selectedIds.has(layer.id))
      .sort((a, b) => a.zIndex - b.zIndex);

    const currentLayers: GeoJSONLayer[] = [];
    const currentBlobs: string[] = [];

    let active = true;
    const controller = new AbortController();

    const hydratePointLayer = async (layer: (typeof renderLayers)[number]) => {
      const isPointLayer =
        layer.type.toLowerCase() === "point" || layer.type === "Point";
      if (
        !isPointLayer ||
        layer.featureCollection ||
        !layer.featureCollectionUrl
      )
        return layer;

      try {
        const response = await fetch(toBackendUrl(layer.featureCollectionUrl), {
          signal: controller.signal,
        });
        if (!response.ok) return layer;
        return {
          ...layer,
          featureCollection: await response.json(),
        };
      } catch {
        return layer;
      }
    };

    const updateExtent = () => {
      if (!active || currentLayers.length === 0) return;
      const extents = renderLayers
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

    const addRenderLayers = async () => {
      if (renderLayers.length === 0) return;
      const hydratedLayers = await Promise.all(
        renderLayers.map(hydratePointLayer),
      );
      if (!active) return;

      const created = hydratedLayers.map((layer) =>
        createBackendLayer(layer, show3DModels, showPositioningIcons),
      );
      created.forEach(({ layers, blobUrls }) => {
        map.addMany(layers);
        currentLayers.push(...layers);
        currentBlobs.push(...blobUrls);
      });
      updateExtent();
    };

    void addRenderLayers();

    return () => {
      active = false;
      controller.abort();
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
  }, [layers, selectedLayerIds, show3DModels, showPositioningIcons]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !goToTarget) return;

    const point = new Point({
      longitude: goToTarget.longitude,
      latitude: goToTarget.latitude,
    });

    const targetObj: any = {
      target: point,
      tilt: 60,
    };
    if (goToTarget.scale != null) {
      targetObj.scale = goToTarget.scale;
    } else {
      targetObj.zoom = goToTarget.zoom ?? 18;
    }

    view
      .goTo(targetObj, { duration: 1500, easing: "ease-in-out" })
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
          }),
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

  // Highlight selected entity in ArcGIS View
  const highlightHandleRef = useRef<any>(null);
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Clear previous highlight
    if (highlightHandleRef.current) {
      highlightHandleRef.current.remove();
      highlightHandleRef.current = null;
    }

    if (!inspectedEntity) return;

    let active = true;

    const applyHighlight = async () => {
      // 1. Search in 3D scene GraphicsLayers first
      const graphicsLayers = [
        sceneLodLayerRef.current,
        independentModelLayerRef.current,
        editorModelLayerRef.current,
        editorGroundLayerRef.current,
        editorExtrudeLayerRef.current,
      ].filter((l): l is GraphicsLayer => Boolean(l));

      for (const layer of graphicsLayers) {
        const graphic = layer.graphics.find((g) => {
          const attrs = g.attributes;
          if (!attrs) return false;
          return (
            attrs.id === inspectedEntity.id ||
            attrs.entityId === inspectedEntity.id ||
            attrs.backendEntityId === inspectedEntity.id
          );
        });

        if (graphic && active) {
          try {
            const layerView = await view.whenLayerView(layer);
            if (active) {
              highlightHandleRef.current = (layerView as any).highlight(
                graphic,
              );
            }
          } catch (err) {
            console.error("Failed to highlight graphic in GraphicsLayer:", err);
          }
          return;
        }
      }

      // 2. Search in main GeoJSONLayers (skip companion point/pin layers ending in " points")
      const geojsonLayers = dataLayersRef.current;
      for (const layer of geojsonLayers) {
        if (layer.title && layer.title.endsWith(" points")) {
          continue; // Skip the map pins companion layer, highlight actual spatial geometry instead!
        }
        try {
          const layerView = await view.whenLayerView(layer);
          const query = layer.createQuery();
          query.where = `id = '${inspectedEntity.id}' OR entityId = '${inspectedEntity.id}' OR backendEntityId = '${inspectedEntity.id}'`;

          const results = await layer.queryFeatures(query);
          if (results.features.length > 0 && active) {
            highlightHandleRef.current = (layerView as any).highlight(
              results.features[0],
            );
            return;
          }
        } catch (err) {
          // Ignore query failures
        }
      }
    };

    void applyHighlight();

    return () => {
      active = false;
      if (highlightHandleRef.current) {
        highlightHandleRef.current.remove();
        highlightHandleRef.current = null;
      }
    };
  }, [inspectedEntity]);

  useEffect(() => {
    const pinsLayer = positioningPinsLayerRef.current;
    const modelLayer = independentModelLayerRef.current;
    if (!pinsLayer || !modelLayer) return;

    pinsLayer.removeAll();
    modelLayer.removeAll();

    // 1. Add pins/models for spatial entities, independent of selected data layers
    independentEntities
      .filter((entity) => !isSceneBackedEntity(entity))
      .forEach((entity) => {
        const center = getEntityCenter(entity.geometry);
        if (!center) return;

        if (showPositioningIcons) {
          const color = entity.color || "#2563eb";
          const symbol = {
            type: "point-3d",
            symbolLayers: [
              {
                type: "icon",
                resource: { href: getMapPinIcon(color) },
                size: 28,
              },
            ],
          } as any;

          pinsLayer.add(
            new Graphic({
              geometry: new Point({
                longitude: center.lng,
                latitude: center.lat,
                z: entity.elevation ?? 0,
              }),
              symbol,
              attributes: {
                id: entity.id,
                name: entity.name || "Spatial entity",
                type: "spatial-entity",
                backendEntityId: entity.id,
              },
              popupTemplate: {
                title: "{name}",
                content: "Spatial entity.",
              },
            }),
          );
        }

        const modelUrl = getEntityModelUrl(entity);
        if (!show3DModels || !modelUrl) return;

        modelLayer.add(
          new Graphic({
            geometry: new Point({
              longitude: center.lng,
              latitude: center.lat,
              z: entity.elevation ?? 0,
            }),
            symbol: modelSymbol(
              modelUrl,
              getEntityModelSize(entity),
              entity.rotationZ ?? 0,
            ),
            attributes: {
              id: entity.id,
              entityId: entity.id,
              backendEntityId: entity.id,
              name: entity.name || "Spatial entity",
              type: "spatial-entity",
            },
            popupTemplate: {
              title: "{name}",
              content: "Spatial entity model.",
            },
          }),
        );
      });

    // 2. Add pins for root scenes
    if (showPositioningIcons)
      rootScenes.forEach((scene) => {
        if (!scene.position || !scene.visible) return;

        const symbol = {
          type: "point-3d",
          symbolLayers: [
            {
              type: "icon",
              resource: { href: getMapPinIcon("#10b981") },
              size: 28,
            },
          ],
        } as any;

        const graphic = new Graphic({
          geometry: new Point({
            longitude: scene.position.x,
            latitude: scene.position.y,
            z: scene.position.z ?? 0,
          }),
          symbol,
          attributes: {
            id: scene.id,
            name: scene.name || "Scene",
            type: "scene-root",
            backendSceneId: scene.id,
          },
          popupTemplate: {
            title: "{name}",
            content: "Scene 3D.",
          },
        });

        pinsLayer.add(graphic);
      });
  }, [independentEntities, rootScenes, show3DModels, showPositioningIcons]);

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

      const model = editorModels.find(
        (item) => item.id === editorSelectedModel,
      );
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
      })
        .then((entity) => {
          graphic.attributes = {
            ...(graphic.attributes ?? {}),
            backendEntityId: entity.id,
          };
        })
        .catch((err) => {
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
    const backendEntityId = graphic.attributes?.backendEntityId as
      | string
      | null
      | undefined;

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
        let clickedRootSceneGraphic: Graphic | null = null;
        for (const result of results) {
          if (result.type !== "graphic") continue;
          entityId = getInspectableEntityId(result.graphic?.attributes);
          if (entityId) break;
          const attrs = result.graphic?.attributes;
          if (attrs?.type === "scene-child") {
            clickedSceneGraphic = result.graphic;
            break;
          }
          if (attrs?.type === "scene-root" && !clickedRootSceneGraphic) {
            clickedRootSceneGraphic = result.graphic;
          }
        }
        clickedSceneGraphic = clickedSceneGraphic ?? clickedRootSceneGraphic;

        if (entityId) {
          try {
            const entity = await fetchSpatialEntity(entityId);
            dispatch(setInspectedEntity(entity));
            dispatch(
              setSceneEditingNodeId(entity.scene?.id || entity.sceneId || null),
            );
          } catch {
            // Entity not found in backend (could be editor graphic), clear
            dispatch(setInspectedEntity(null));
            dispatch(setSceneEditingNodeId(null));
          }
        } else if (clickedSceneGraphic) {
          try {
            const attrs = clickedSceneGraphic.attributes ?? {};
            const sceneId = attrs.id;
            const scene = attrs.sceneNode ?? (await fetchSceneById(sceneId));
            const parentScene = attrs.parentScene ?? scene.parent ?? null;
            const rootScene = attrs.rootScene ?? scene;
            const rootSceneId = String(
              attrs.rootSceneId ?? rootScene.id ?? scene.id,
            );
            const activeLodLevel = sceneLodLevelsBySceneId[rootSceneId] ?? activeSceneLodLevel;
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
                activeLodLevel,
                breadcrumb: attrs.breadcrumb ??
                  (parentScene?.name
                    ? `${parentScene.name} > ${scene.name}`
                    : scene.name),
                childCount: attrs.childCount ?? scene.children?.length ?? 0,
                lodLevel: scene.lodLevel ?? 0,
                parentSceneId: parentScene?.id ?? null,
                parentSceneName: parentScene?.name ?? null,
                rootSceneId,
                rootSceneName: rootScene.name ?? scene.name,
                description:
                  scene.description ??
                  `Khối mô hình LOD ${scene.lodLevel ?? 0}`,
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
  }, [
    pickingCoordinateActive,
    sceneEditMode,
    editorOpen,
    editorTool,
    sceneLodLevelsBySceneId,
    activeSceneLodLevel,
    dispatch,
  ]);

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

      const targetId =
        inspectedEntity?.id || inspectedEntity?.sceneId || sceneEditingNodeId;
      if (!targetId) return;

      let targetGraphic = sceneLodLayer.graphics.find(
        (g) =>
          g.attributes?.id === targetId || g.attributes?.entityId === targetId,
      );

      if (!targetGraphic && independentModelLayerRef.current) {
        targetGraphic = independentModelLayerRef.current.graphics.find(
          (g) =>
            g.attributes?.backendEntityId === targetId ||
            g.attributes?.entityId === targetId,
        );
      }

      if (!targetGraphic && editorModelLayerRef.current) {
        targetGraphic = editorModelLayerRef.current.graphics.find(
          (g) =>
            g.attributes?.backendEntityId === targetId ||
            g.attributes?.editorId === targetId,
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
