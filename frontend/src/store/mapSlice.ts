import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const DEFAULT_BASEMAP_STYLE = "arcgis/streets";
const GROUND_OPACITY_DEFAULT = 1.0;
import type { BackendLayer, BackendModel3D, BackendSpatialEntity } from "../types/backend";
import type { MapViewState, TerrainMode } from "../types/map";
import type { BasemapStyle } from "../utils/basemapStyles";
import { getEntityCenter } from "../utils/geometry";
import {
  fetchLayers as fetchLayersApi,
  createLayer as createLayerApi,
  updateLayer as updateLayerApi,
  deleteLayer as deleteLayerApi,
  uploadLayerGeoJson as uploadLayerGeoJsonApi,
  uploadLayerModel as uploadLayerModelApi,
  uploadLayerIcon as uploadLayerIconApi,
  updateSpatialEntity as updateSpatialEntityApi,
  deleteSpatialEntity as deleteSpatialEntityApi,
  createSpatialEntity as createSpatialEntityApi,
  uploadEntityModel as uploadEntityModelApi,
  fetchSpatialEntities as fetchSpatialEntitiesApi,
} from "../utils/backendApi";
import type { RootState } from "./store";

type LayerStatus = "loading" | "ready" | "error";
export type EditorTool = "select" | "place-model" | "draw-extrude" | "draw-ground";
export type EditorFeatureKind = "model" | "extrude" | "ground";
export type SceneLodLevel = 0 | 1 | 2;

export type SceneInteractionState = {
  activeSceneId: string | null;
  activeLodLevel: SceneLodLevel;
  activeLodLevelsBySceneId: Record<string, SceneLodLevel>;
  selectedSceneNodeId: string | null;
  hoveredSceneNodeId?: string | null;
};

export type EditorFeatureState = {
  id: string;
  kind: EditorFeatureKind;
  name: string;
  modelType?: string;
  size?: number;
  rotation?: number;
  height?: number;
  color?: string;
  area?: number;
  distance?: number;
  deflection?: number;
  elevation?: number;
};

type MapState = {
  terrainEnabled: boolean;
  terrainStyle: Exclude<TerrainMode, "flat">;
  basemapStyles: BasemapStyle[];
  basemapStyleId: string;
  viewState: MapViewState | null;
  groundOpacity: number;
  panelCollapsed: boolean;
  layers: BackendLayer[];
  independentEntities: BackendSpatialEntity[];
  selectedLayerIds: string[];
  layerStatus: LayerStatus;
  layerError: string | null;
  goToTarget: { longitude: number; latitude: number; zoom?: number; scale?: number } | null;
  showPositioningIcons: boolean;
  show3DModels: boolean;
  layerPanelOpen: boolean;
  pickingCoordinateActive: boolean;
  pickedCoordinate: { longitude: number; latitude: number; elevation?: number } | null;
  editorOpen: boolean;
  editorTool: EditorTool;
  editorSelectedModel: string;
  editorModels: BackendModel3D[];
  editorExtrudeColor: string;
  editorGroundColor: string;
  editorSelectedFeature: EditorFeatureState | null;
  editorSceneServiceUrl: string | null;
  editorSceneLayerType: 'scene' | 'building';
  editorSliceEnabled: boolean;
  editorSliceExcludeDoors: boolean;
  editorSliceDoorsRed: boolean;
  editorSliceHeading: number;
  editorSliceTilt: number;
  editorUpdateRequest: {
    nonce: number;
    values: Partial<EditorFeatureState>;
  } | null;
  editorDeleteRequest: number;
  sceneEditMode: boolean;
  sceneEditingNodeId: string | null;
  sceneInteraction: SceneInteractionState;
  placementMode: boolean;
  placementSceneId: string | null;
  placementFileUrl: string | null;
  placementPreview: {
    longitude: number;
    latitude: number;
    elevation: number;
    heading: number;
    scale?: number;
  } | null;
  inspectedEntity: BackendSpatialEntity | null;
};

type FileUploadPayload = {
  layerId: string;
  file: File;
};

type CreateLayerWithFilesPayload = {
  layerPayload: Partial<BackendLayer>;
  geoJsonFile?: File | null;
  modelFile?: File | null;
  iconFile?: File | null;
};

const computeSelectedLayerIds = (
  prevSelected: string[],
  layers: BackendLayer[],
) => {
  return prevSelected.filter((id) => layers.some((l) => l.id === id));
};

const fetchMapData = async () => {
  const [layers, independentEntities] = await Promise.all([
    fetchLayersApi(),
    fetchSpatialEntitiesApi("none"),
  ]);
  return { layers, independentEntities };
};

export const loadLayers = createAsyncThunk("map/loadLayers", async () => {
  return fetchMapData();
});

export const createLayer = createAsyncThunk(
  "map/createLayer",
  async (payload: Partial<BackendLayer>) => {
    await createLayerApi(payload);
    return fetchMapData();
  },
);

export const createLayerWithFiles = createAsyncThunk(
  "map/createLayerWithFiles",
  async ({
    layerPayload,
    geoJsonFile,
    modelFile,
    iconFile,
  }: CreateLayerWithFilesPayload) => {
    let createdLayer: BackendLayer;

    if (geoJsonFile) {
      createdLayer = await uploadLayerGeoJsonApi(geoJsonFile, layerPayload);
    } else {
      createdLayer = await createLayerApi(layerPayload);
    }

    if (modelFile) {
      await uploadLayerModelApi(createdLayer.id, modelFile);
    }
    if (iconFile) {
      await uploadLayerIconApi(createdLayer.id, iconFile);
    }

    return fetchMapData();
  },
);

export const updateLayer = createAsyncThunk(
  "map/updateLayer",
  async ({
    layerId,
    payload,
  }: {
    layerId: string;
    payload: Partial<BackendLayer>;
  }) => {
    await updateLayerApi(layerId, payload);
    return fetchMapData();
  },
);

export const deleteLayer = createAsyncThunk(
  "map/deleteLayer",
  async (layerId: string) => {
    await deleteLayerApi(layerId);
    return fetchMapData();
  },
);

export const uploadLayerModel = createAsyncThunk(
  "map/uploadLayerModel",
  async ({ layerId, file }: FileUploadPayload) => {
    await uploadLayerModelApi(layerId, file);
    return fetchMapData();
  },
);

export const uploadLayerIcon = createAsyncThunk(
  "map/uploadLayerIcon",
  async ({ layerId, file }: FileUploadPayload) => {
    await uploadLayerIconApi(layerId, file);
    return fetchMapData();
  },
);

export const uploadLayerGeoJson = createAsyncThunk(
  "map/uploadLayerGeoJson",
  async ({
    file,
    payload,
  }: {
    file: File;
    payload: Partial<BackendLayer>;
  }) => {
    await uploadLayerGeoJsonApi(file, payload);
    return fetchMapData();
  },
);

export const updateEntity = createAsyncThunk(
  "map/updateEntity",
  async ({
    entityId,
    payload,
    modelFile,
  }: {
    entityId: string;
    payload: Partial<BackendSpatialEntity>;
    modelFile?: File | null;
  }) => {
    await updateSpatialEntityApi(entityId, payload);
    if (modelFile) {
      await uploadEntityModelApi(entityId, modelFile);
    }
    return fetchMapData();
  },
);

export const deleteEntity = createAsyncThunk(
  "map/deleteEntity",
  async (entityId: string) => {
    await deleteSpatialEntityApi(entityId);
    return fetchMapData();
  },
);

export const createEntity = createAsyncThunk(
  "map/createEntity",
  async ({
    payload,
    modelFile,
  }: {
    payload: Partial<BackendSpatialEntity> & { layerId?: string | null };
    modelFile?: File | null;
  }) => {
    const entity = await createSpatialEntityApi(payload);
    if (modelFile) {
      await uploadEntityModelApi(entity.id, modelFile);
    }
    return fetchMapData();
  },
);

const initialState: MapState = {
  terrainEnabled: true,
  terrainStyle: "world-elevation",
  basemapStyles: [],
  basemapStyleId: DEFAULT_BASEMAP_STYLE,
  viewState: null,
  groundOpacity: GROUND_OPACITY_DEFAULT,
  panelCollapsed: true,
  layers: [],
  independentEntities: [],
  selectedLayerIds: [],
  layerStatus: "loading",
  layerError: null,
  goToTarget: null,
  showPositioningIcons: true,
  show3DModels: true,
  layerPanelOpen: false,
  pickingCoordinateActive: false,
  pickedCoordinate: null,
  editorOpen: false,
  editorTool: "select",
  editorSelectedModel: "",
  editorModels: [],
  editorExtrudeColor: "#38bdf8",
  editorGroundColor: "#f97316",
  editorSelectedFeature: null,
  editorSceneServiceUrl: null,
  editorSceneLayerType: "scene",
  editorSliceEnabled: false,
  editorSliceExcludeDoors: true,
  editorSliceDoorsRed: false,
  editorSliceHeading: 0,
  editorSliceTilt: 90,
  editorUpdateRequest: null,
  editorDeleteRequest: 0,
  sceneEditMode: false,
  sceneEditingNodeId: null,
  sceneInteraction: {
    activeSceneId: null,
    activeLodLevel: 0,
    activeLodLevelsBySceneId: {},
    selectedSceneNodeId: null,
    hoveredSceneNodeId: null,
  },
  placementMode: false,
  placementSceneId: null,
  placementFileUrl: null,
  placementPreview: null,
  inspectedEntity: null,
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    setTerrainEnabled(state, action) {
      state.terrainEnabled = action.payload as boolean;
    },
    setTerrainStyle(state, action) {
      state.terrainStyle = action.payload as Exclude<TerrainMode, "flat">;
    },
    setBasemapStyles(state, action) {
      state.basemapStyles = action.payload as BasemapStyle[];
    },
    setBasemapStyleId(state, action) {
      state.basemapStyleId = action.payload as string;
    },
    setViewState(state, action) {
      state.viewState = action.payload as MapViewState | null;
    },
    setGroundOpacity(state, action) {
      state.groundOpacity = action.payload as number;
    },
    setPanelCollapsed(state, action) {
      state.panelCollapsed = action.payload as boolean;
    },
    toggleLayerSelection(state, action) {
      const layerId = action.payload as string;
      state.selectedLayerIds = state.selectedLayerIds.includes(layerId)
        ? state.selectedLayerIds.filter((id) => id !== layerId)
        : [...state.selectedLayerIds, layerId];
    },
    selectAllLayers(state) {
      state.selectedLayerIds = state.layers.map((layer) => layer.id);
    },
    clearLayerSelection(state) {
      state.selectedLayerIds = [];
    },
    goToEntity(state, action) {
      const entity = action.payload as BackendSpatialEntity;
      const center = getEntityCenter(entity.geometry);
      if (center) {
        state.goToTarget = {
          longitude: center.lng,
          latitude: center.lat,
          scale: 50,
        };
      }
    },
    goToPosition(state, action) {
      state.goToTarget = action.payload as { longitude: number; latitude: number; zoom?: number; scale?: number };
    },
    clearGoToTarget(state) {
      state.goToTarget = null;
    },
    setShowPositioningIcons(state, action) {
      state.showPositioningIcons = action.payload as boolean;
    },
    setShow3DModels(state, action) {
      state.show3DModels = action.payload as boolean;
    },
    setLayerPanelOpen(state, action) {
      state.layerPanelOpen = action.payload as boolean;
    },
    setPickingCoordinateActive(state, action) {
      state.pickingCoordinateActive = action.payload as boolean;
    },
    setPickedCoordinate(state, action) {
      state.pickedCoordinate = action.payload as { longitude: number; latitude: number; elevation?: number } | null;
    },
    setEditorOpen(state, action) {
      state.editorOpen = action.payload as boolean;
    },
    setEditorTool(state, action) {
      state.editorTool = action.payload as EditorTool;
    },
    setEditorSelectedModel(state, action) {
      state.editorSelectedModel = action.payload as string;
    },
    setEditorModels(state, action) {
      state.editorModels = action.payload as BackendModel3D[];
      const placeableModels = state.editorModels.filter((model) => Boolean(model.assetUrl));
      if (!state.editorSelectedModel && placeableModels.length > 0) {
        state.editorSelectedModel = placeableModels[0].id;
      }
      if (
        state.editorSelectedModel &&
        placeableModels.length > 0 &&
        !placeableModels.some((model) => model.id === state.editorSelectedModel)
      ) {
        state.editorSelectedModel = placeableModels[0].id;
      }
    },
    setEditorExtrudeColor(state, action) {
      state.editorExtrudeColor = action.payload as string;
    },
    setEditorGroundColor(state, action) {
      state.editorGroundColor = action.payload as string;
    },
    setEditorSelectedFeature(state, action) {
      state.editorSelectedFeature = action.payload as EditorFeatureState | null;
    },
    setEditorSceneService(state, action) {
      const payload = action.payload as {
        url: string | null;
        layerType?: 'scene' | 'building';
      };
      state.editorSceneServiceUrl = payload.url;
      state.editorSceneLayerType = payload.layerType ?? 'scene';
    },
    setEditorSliceEnabled(state, action) {
      state.editorSliceEnabled = action.payload as boolean;
    },
    setEditorSliceExcludeDoors(state, action) {
      state.editorSliceExcludeDoors = action.payload as boolean;
    },
    setEditorSliceDoorsRed(state, action) {
      state.editorSliceDoorsRed = action.payload as boolean;
    },
    setEditorSliceHeading(state, action) {
      state.editorSliceHeading = action.payload as number;
    },
    setEditorSliceTilt(state, action) {
      state.editorSliceTilt = action.payload as number;
    },
    requestEditorFeatureUpdate(state, action) {
      state.editorUpdateRequest = {
        nonce: (state.editorUpdateRequest?.nonce ?? 0) + 1,
        values: action.payload as Partial<EditorFeatureState>,
      };
    },
    requestEditorFeatureDelete(state) {
      state.editorDeleteRequest += 1;
    },
    setSceneEditMode(state, action) {
      state.sceneEditMode = action.payload as boolean;
    },
    setSceneEditingNodeId(state, action) {
      state.sceneEditingNodeId = action.payload as string | null;
    },
    setActiveSceneId(state, action) {
      state.sceneInteraction.activeSceneId = action.payload as string | null;
    },
    setActiveLodLevel(state, action) {
      const lodLevel = action.payload as SceneLodLevel;
      state.sceneInteraction.activeLodLevel = lodLevel;
      state.sceneInteraction.selectedSceneNodeId = null;
    },
    setSceneLodLevel(state, action) {
      const payload = action.payload as {
        sceneId: string;
        lodLevel: SceneLodLevel;
      };
      state.sceneInteraction.activeLodLevelsBySceneId[payload.sceneId] = payload.lodLevel;
      state.sceneInteraction.activeSceneId = payload.sceneId;
      state.sceneInteraction.selectedSceneNodeId = null;
    },
    setSelectedSceneNodeId(state, action) {
      state.sceneInteraction.selectedSceneNodeId = action.payload as string | null;
    },
    setHoveredSceneNodeId(state, action) {
      state.sceneInteraction.hoveredSceneNodeId = action.payload as string | null;
    },
    startPlacement(state, action) {
      state.placementMode = true;
      if (typeof action.payload === "string") {
        state.placementSceneId = action.payload;
        state.placementFileUrl = null;
      } else {
        state.placementSceneId = action.payload.sceneId;
        state.placementFileUrl = action.payload.fileUrl || null;
      }
      state.placementPreview = null;
    },
    updatePlacementPreview(state, action) {
      state.placementPreview = action.payload;
    },
    confirmPlacement(state) {
      state.placementMode = false;
      state.placementSceneId = null;
      state.placementFileUrl = null;
      state.placementPreview = null;
    },
    cancelPlacement(state) {
      state.placementMode = false;
      state.placementSceneId = null;
      state.placementFileUrl = null;
      state.placementPreview = null;
    },
    setInspectedEntity(state, action) {
      state.inspectedEntity = action.payload as BackendSpatialEntity | null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLayers.pending, (state) => {
        state.layerStatus = "loading";
        state.layerError = null;
      })
      .addCase(loadLayers.fulfilled, (state, action) => {
        state.layers = action.payload.layers;
        state.independentEntities = action.payload.independentEntities;
        state.selectedLayerIds = computeSelectedLayerIds(
          state.selectedLayerIds,
          state.layers,
        );
        state.layerStatus = "ready";
        state.layerError = null;
      })
      .addCase(loadLayers.rejected, (state) => {
        state.layerStatus = "error";
        state.layerError = "Không tải được danh sách layer từ backend";
      });

    const refreshCases = [
      createLayer,
      createLayerWithFiles,
      updateLayer,
      deleteLayer,
      uploadLayerModel,
      uploadLayerIcon,
      uploadLayerGeoJson,
      updateEntity,
      deleteEntity,
      createEntity,
    ];

    refreshCases.forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.layerStatus = "loading";
          state.layerError = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.layers = action.payload.layers;
          state.independentEntities = action.payload.independentEntities;
          state.selectedLayerIds = computeSelectedLayerIds(
            state.selectedLayerIds,
            state.layers,
          );
          state.layerStatus = "ready";
          state.layerError = null;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.layerStatus = "error";
          state.layerError =
            (action.error?.message as string | undefined) ?? "Upload error";
        });
    });
  },
});

export const {
  setTerrainEnabled,
  setTerrainStyle,
  setBasemapStyles,
  setBasemapStyleId,
  setViewState,
  setGroundOpacity,
  setPanelCollapsed,
  toggleLayerSelection,
  selectAllLayers,
  clearLayerSelection,
  goToEntity,
  goToPosition,
  clearGoToTarget,
  setShowPositioningIcons,
  setShow3DModels,
  setLayerPanelOpen,
  setPickingCoordinateActive,
  setPickedCoordinate,
  setEditorOpen,
  setEditorTool,
  setEditorSelectedModel,
  setEditorModels,
  setEditorExtrudeColor,
  setEditorGroundColor,
  setEditorSelectedFeature,
  setEditorSceneService,
  setEditorSliceEnabled,
  setEditorSliceExcludeDoors,
  setEditorSliceDoorsRed,
  setEditorSliceHeading,
  setEditorSliceTilt,
  requestEditorFeatureUpdate,
  requestEditorFeatureDelete,
  setSceneEditMode,
  setSceneEditingNodeId,
  setActiveSceneId,
  setActiveLodLevel,
  setSceneLodLevel,
  setSelectedSceneNodeId,
  setHoveredSceneNodeId,
  startPlacement,
  updatePlacementPreview,
  confirmPlacement,
  cancelPlacement,
  setInspectedEntity,
} = mapSlice.actions;

export const selectTerrainEnabled = (s: RootState) => s.map.terrainEnabled;
export const selectTerrainStyle = (s: RootState) => s.map.terrainStyle;
export const selectBasemapStyles = (s: RootState) => s.map.basemapStyles;
export const selectBasemapStyleId = (s: RootState) => s.map.basemapStyleId;
export const selectViewState = (s: RootState) => s.map.viewState;
export const selectGroundOpacity = (s: RootState) => s.map.groundOpacity;
export const selectPanelCollapsed = (s: RootState) => s.map.panelCollapsed;
export const selectLayers = (s: RootState) => s.map.layers;
export const selectIndependentEntities = (s: RootState) => s.map.independentEntities;
export const selectSelectedLayerIds = (s: RootState) => s.map.selectedLayerIds;
export const selectLayerStatus = (s: RootState) => s.map.layerStatus;
export const selectLayerError = (s: RootState) => s.map.layerError;
export const selectGoToTarget = (s: RootState) => s.map.goToTarget;
export const selectShowPositioningIcons = (s: RootState) => s.map.showPositioningIcons;
export const selectShow3DModels = (s: RootState) => s.map.show3DModels;
export const selectLayerPanelOpen = (s: RootState) => s.map.layerPanelOpen;
export const selectPickingCoordinateActive = (s: RootState) => s.map.pickingCoordinateActive;
export const selectPickedCoordinate = (s: RootState) => s.map.pickedCoordinate;
export const selectEditorOpen = (s: RootState) => s.map.editorOpen;
export const selectEditorTool = (s: RootState) => s.map.editorTool;
export const selectEditorSelectedModel = (s: RootState) => s.map.editorSelectedModel;
export const selectEditorModels = (s: RootState) => s.map.editorModels;
export const selectEditorExtrudeColor = (s: RootState) => s.map.editorExtrudeColor;
export const selectEditorGroundColor = (s: RootState) => s.map.editorGroundColor;
export const selectEditorSelectedFeature = (s: RootState) => s.map.editorSelectedFeature;
export const selectEditorSceneServiceUrl = (s: RootState) => s.map.editorSceneServiceUrl;
export const selectEditorSceneLayerType = (s: RootState) => s.map.editorSceneLayerType;
export const selectEditorSliceEnabled = (s: RootState) => s.map.editorSliceEnabled;
export const selectEditorSliceExcludeDoors = (s: RootState) => s.map.editorSliceExcludeDoors;
export const selectEditorSliceDoorsRed = (s: RootState) => s.map.editorSliceDoorsRed;
export const selectEditorSliceHeading = (s: RootState) => s.map.editorSliceHeading;
export const selectEditorSliceTilt = (s: RootState) => s.map.editorSliceTilt;
export const selectEditorUpdateRequest = (s: RootState) => s.map.editorUpdateRequest;
export const selectEditorDeleteRequest = (s: RootState) => s.map.editorDeleteRequest;
export const selectSceneEditMode = (s: RootState) => s.map.sceneEditMode;
export const selectSceneEditingNodeId = (s: RootState) => s.map.sceneEditingNodeId;
export const selectSceneInteraction = (s: RootState) => s.map.sceneInteraction;
export const selectActiveSceneId = (s: RootState) => s.map.sceneInteraction.activeSceneId;
export const selectActiveLodLevel = (s: RootState) => s.map.sceneInteraction.activeLodLevel;
export const selectSceneLodLevelsBySceneId = (s: RootState) =>
  s.map.sceneInteraction.activeLodLevelsBySceneId;
export const selectSelectedSceneNodeId = (s: RootState) =>
  s.map.sceneInteraction.selectedSceneNodeId;
export const selectHoveredSceneNodeId = (s: RootState) =>
  s.map.sceneInteraction.hoveredSceneNodeId;
export const selectPlacementMode = (s: RootState) => s.map.placementMode;
export const selectPlacementSceneId = (s: RootState) => s.map.placementSceneId;
export const selectPlacementFileUrl = (s: RootState) => s.map.placementFileUrl;
export const selectPlacementPreview = (s: RootState) => s.map.placementPreview;
export const selectInspectedEntity = (s: RootState) => s.map.inspectedEntity;

export const selectEffectiveTerrain = (s: RootState): TerrainMode =>
  s.map.terrainEnabled ? s.map.terrainStyle : "flat";

export default mapSlice.reducer;
