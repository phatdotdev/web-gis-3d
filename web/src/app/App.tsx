import Camera from '@arcgis/core/Camera'
import { Download, Globe, Layers, MapPinned, PanelLeft, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayerPanel, type LayerRuntimeStatus } from '../features/layer-management/components/LayerPanel'
import { useLayerManagement } from '../features/layer-management/hooks/useLayerManagement'
import { ArcgisSceneMap } from '../features/map/components/ArcgisSceneMap'
import { MapInspector } from '../features/map/components/MapInspector'
import { MapToolbar } from '../features/map/components/MapToolbar'
import { useArcgisScene, type ArcgisMapContexts } from '../features/map/hooks/useArcgisScene'
import { useMapSelection } from '../features/map/hooks/useMapSelection'
import { SpatialEntityPanel } from '../features/spatial-entity-management/components/SpatialEntityPanel'
import { useSpatialEntityManagement } from '../features/spatial-entity-management/hooks/useSpatialEntityManagement'
import { exportCurrentDataAsJson } from '../services/mock-backend/fileStorageService'
import {
  buildArcgisGeojsonQueryUrl,
  clearGeojsonCache,
  loadGeojsonForSource,
} from '../services/mock-backend/geojsonRepository'
import { normalizeLayerGeojson, normalizeSpatialEntity } from '../services/geojson/geojsonNormalizer'
import type { LayerConfig } from '../types/layer'
import type { InspectorFeature, NormalizedSpatialFeature } from '../types/map'
import type { SpatialEntityConfig } from '../types/spatialEntity'
import { removeFeaturesBySource } from '../utils/map-renderer/clearMapGraphics'
import { clearHighlight, highlightFeature, renderSpatialFeatures, zoomToFeature } from '../utils/map-renderer/layerRenderer'

type LeftTab = 'layers' | 'entities'

export default function App() {
  const { contextsRef, setContexts } = useArcgisScene()
  const { selectedFeature, setSelectedFeature, clearSelection } = useMapSelection()
  const { layers, loading, error, saveLayer, deleteLayer, setLayers } = useLayerManagement()
  const {
    entities,
    loading: entitiesLoading,
    error: entitiesError,
    saveEntity,
    deleteEntity,
    setEntities,
  } = useSpatialEntityManagement()

  const [statusByLayerId, setStatusByLayerId] = useState<Record<string, LayerRuntimeStatus>>({})
  const [mapReady, setMapReady] = useState(false)
  const [renderVersion, setRenderVersion] = useState(0)
  const [leftTab, setLeftTab] = useState<LeftTab>('layers')
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [pickedCoordinate, setPickedCoordinate] = useState<{ longitude: number; latitude: number; z: number } | null>(null)

  const featureRegistryRef = useRef(new Map<string, NormalizedSpatialFeature>())
  const normalizedLayerCacheRef = useRef(new Map<string, NormalizedSpatialFeature[]>())
  const initialRenderDoneRef = useRef(false)

  const layerNameById = useMemo(
    () => new Map(layers.map((layer) => [layer.layerId, layer.layerName])),
    [layers],
  )

  /** Map<layerId, NormalizedSpatialFeature[]> for children display */
  const featuresByLayerId = useMemo(() => {
    const map = new Map<string, NormalizedSpatialFeature[]>()
    featureRegistryRef.current.forEach((feature) => {
      if (feature.layerId) {
        if (!map.has(feature.layerId)) {
          map.set(feature.layerId, [])
        }
        map.get(feature.layerId)!.push(feature)
      }
    })
    // Force dependency on renderVersion
    void renderVersion
    return map
  }, [renderVersion])

  const registerFeatures = useCallback((features: NormalizedSpatialFeature[]) => {
    features.forEach((feature) => featureRegistryRef.current.set(feature.id, feature))
    setRenderVersion((value) => value + 1)
  }, [])

  const unregisterBySource = useCallback((sourceType: 'layer' | 'entity', sourceId: string) => {
    featureRegistryRef.current.forEach((feature, featureId) => {
      if (
        feature.sourceType === sourceType &&
        (feature.layerId === sourceId || feature.entityId === sourceId)
      ) {
        featureRegistryRef.current.delete(featureId)
      }
    })
    setRenderVersion((value) => value + 1)
  }, [])

  const loadLayerToMap = useCallback(
    async (layer: LayerConfig, forceReload = false) => {
      const contexts = contextsRef.current
      if (!contexts) {
        return
      }

      if (!layer.visible) {
        removeFeaturesBySource(contexts.layer, 'layer', layer.layerId)
        unregisterBySource('layer', layer.layerId)
        return
      }

      setStatusByLayerId((current) => ({
        ...current,
        [layer.layerId]: {
          loaded: current[layer.layerId]?.loaded ?? 0,
          loading: true,
          progress: 0,
        },
      }))

      try {
        if (forceReload) {
          clearGeojsonCache(layer.layerId)
          normalizedLayerCacheRef.current.delete(layer.layerId)
        }

        const cachedFeatures = normalizedLayerCacheRef.current.get(layer.layerId)
        const features =
          cachedFeatures ??
          normalizeLayerGeojson(layer, await loadGeojsonForSource(layer.layerId, resolveLayerGeojsonUrl(layer)))

        normalizedLayerCacheRef.current.set(layer.layerId, features)
        removeFeaturesBySource(contexts.layer, 'layer', layer.layerId)
        unregisterBySource('layer', layer.layerId)

        await renderSpatialFeatures(contexts.layer, features, {
          clearBeforeRender: false,
          chunkSize: 300,
          onProgress: (rendered, total) => {
            setStatusByLayerId((current) => ({
              ...current,
              [layer.layerId]: {
                loaded: rendered,
                loading: true,
                progress: Math.round((rendered / Math.max(total, 1)) * 100),
              },
            }))
          },
        })
        registerFeatures(features)
        setStatusByLayerId((current) => ({
          ...current,
          [layer.layerId]: {
            loaded: features.length,
            loading: false,
            progress: 100,
          },
        }))
      } catch (reason) {
        setStatusByLayerId((current) => ({
          ...current,
          [layer.layerId]: {
            loaded: current[layer.layerId]?.loaded ?? 0,
            loading: false,
            progress: 0,
            error: reason instanceof Error ? reason.message : 'Lỗi tải dữ liệu lớp.',
          },
        }))
      }
    },
    [contextsRef, registerFeatures, unregisterBySource],
  )

  const renderEntityToMap = useCallback(
    async (entity: SpatialEntityConfig) => {
      const contexts = contextsRef.current
      if (!contexts) {
        return
      }

      removeFeaturesBySource(contexts.entity, 'entity', entity.entityId)
      unregisterBySource('entity', entity.entityId)

      if (!entity.visible) {
        return
      }

      const feature = normalizeSpatialEntity(entity)
      await renderSpatialFeatures(contexts.entity, [feature], { clearBeforeRender: false, chunkSize: 1 })
      registerFeatures([feature])
    },
    [contextsRef, registerFeatures, unregisterBySource],
  )

  const renderAllVisible = useCallback(
    async (forceReload = false) => {
      await Promise.all(layers.filter((layer) => layer.visible).map((layer) => loadLayerToMap(layer, forceReload)))
      await Promise.all(entities.filter((entity) => entity.visible).map(renderEntityToMap))
    },
    [entities, layers, loadLayerToMap, renderEntityToMap],
  )

  useEffect(() => {
    if (!mapReady || loading || entitiesLoading || initialRenderDoneRef.current) {
      return
    }

    initialRenderDoneRef.current = true
    void renderAllVisible(false)
  }, [entitiesLoading, loading, mapReady, renderAllVisible])

  const handleMapReady = useCallback(
    (contexts: ArcgisMapContexts) => {
      initialRenderDoneRef.current = false
      setContexts(contexts)
      setMapReady(true)
    },
    [setContexts],
  )

  const handleFeatureClick = useCallback(
    (featureId: string) => {
      const feature = featureRegistryRef.current.get(featureId)
      const contexts = contextsRef.current
      if (!feature || !contexts) {
        return
      }

      const inspectorFeature: InspectorFeature = {
        ...feature,
        layerName: feature.layerId ? layerNameById.get(feature.layerId) : undefined,
      }
      setSelectedFeature(inspectorFeature)
      highlightFeature(contexts.layer, feature)
    },
    [contextsRef, layerNameById, setSelectedFeature],
  )

  const handleMapClick = useCallback((point: { longitude: number; latitude: number; z: number }) => {
    setPickedCoordinate(point)
  }, [])

  const closeInspector = useCallback(() => {
    const contexts = contextsRef.current
    if (contexts) {
      clearHighlight(contexts.layer)
    }
    clearSelection()
  }, [clearSelection, contextsRef])

  async function toggleLayer(layer: LayerConfig) {
    const nextLayer = { ...layer, visible: !layer.visible }
    await saveLayer(nextLayer)
    setLayers((current) => current.map((item) => (item.layerId === layer.layerId ? nextLayer : item)))
    await loadLayerToMap(nextLayer)
  }

  async function updateLayer(layer: LayerConfig) {
    normalizedLayerCacheRef.current.delete(layer.layerId)
    await saveLayer(layer)
    setLayers((current) => current.map((item) => (item.layerId === layer.layerId ? layer : item)))
    await loadLayerToMap(layer, true)
  }

  async function removeLayer(layerId: string) {
    const contexts = contextsRef.current
    if (contexts) {
      removeFeaturesBySource(contexts.layer, 'layer', layerId)
    }
    unregisterBySource('layer', layerId)
    normalizedLayerCacheRef.current.delete(layerId)
    await deleteLayer(layerId)
  }

  async function toggleEntity(entity: SpatialEntityConfig) {
    const nextEntity = { ...entity, visible: !entity.visible }
    await saveEntity(nextEntity)
    setEntities((current) => current.map((item) => (item.entityId === entity.entityId ? nextEntity : item)))
    await renderEntityToMap(nextEntity)
  }

  async function upsertEntity(entity: SpatialEntityConfig) {
    await saveEntity(entity)
    setEntities((current) => {
      const index = current.findIndex((item) => item.entityId === entity.entityId)
      if (index < 0) {
        return [...current, entity]
      }
      const next = [...current]
      next[index] = entity
      return next
    })
    await renderEntityToMap(entity)
  }

  async function removeEntity(entityId: string) {
    const contexts = contextsRef.current
    await deleteEntity(entityId)
    setEntities((current) => current.filter((entity) => entity.entityId !== entityId))
    if (contexts) {
      removeFeaturesBySource(contexts.entity, 'entity', entityId)
    }
    unregisterBySource('entity', entityId)
  }

  function zoomLayer(layerId: string) {
    const feature = [...featureRegistryRef.current.values()].find((item) => item.layerId === layerId)
    if (feature && contextsRef.current) {
      void zoomToFeature(contextsRef.current.layer, feature.id)
    }
  }

  function zoomItem(featureId: string) {
    const contexts = contextsRef.current
    if (contexts) {
      // Try layer context first, then entity context
      void zoomToFeature(contexts.layer, featureId)
    }
  }

  function resetView() {
    const view = contextsRef.current?.layer.view
    if (!view) {
      return
    }

    void view.goTo(new Camera({
      position: {
        longitude: 105.7821,
        latitude: 10.0298,
        z: 1800,
      },
      tilt: 62,
      heading: 0,
    }))
  }

  function toggleSelectedModel(featureId: string) {
    const graphics = contextsRef.current?.layer.graphicIndex.get(featureId)
    graphics?.forEach((graphic) => {
      const attributes = graphic.attributes as Record<string, unknown>
      if (attributes.appGraphicRole === 'model') {
        graphic.visible = !graphic.visible
      }
    })
  }

  function exportData() {
    exportCurrentDataAsJson({
      layers,
      entities,
      exportedAt: new Date().toISOString(),
    })
  }

  function selectFeatureById(featureId: string) {
    handleFeatureClick(featureId)
  }

  const loadedFeatureCount = featureRegistryRef.current.size + renderVersion * 0

  return (
    <div className="h-full w-full relative app-root bg-[var(--color-bg)] flex flex-col">
      {/* ── Top Bar ── */}
      <header className="top-bar flex-shrink-0">
        <div className="top-bar-title">
          <Globe size={20} className="text-[var(--color-teal)]" />
          <div>
            <h1>Hệ thống GIS 3D</h1>
            <p>Bản đồ không gian — ArcGIS SceneView</p>
          </div>
        </div>
        <div className="top-bar-actions">
          <button className="btn-header" type="button" onClick={exportData}>
            <Download size={14} />
            Xuất JSON
          </button>
          <button
            className="btn-header"
            type="button"
            onClick={() => setLeftPanelOpen((v) => !v)}
            title={leftPanelOpen ? 'Ẩn bảng quản lý' : 'Hiện bảng quản lý'}
          >
            <PanelLeft size={14} />
          </button>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <div className="relative flex-1 w-full overflow-hidden">
        {/* ── Full-screen ArcGIS 3D Map ── */}
        <ArcgisSceneMap onReady={handleMapReady} onFeatureClick={handleFeatureClick} onMapClick={handleMapClick} />

        {/* ── Map Toolbar ── */}
      <MapToolbar
        onResetView={resetView}
        onClearSelection={closeInspector}
        onReloadVisible={() => void renderAllVisible(true)}
        loadedFeatureCount={loadedFeatureCount}
      />

      {/* ── Left Floating Panel ── */}
      {leftPanelOpen ? (
        <aside className="floating-panel floating-panel-left" id="left-panel">
          {/* Tabs */}
          <nav className="panel-tabs">
            <button
              type="button"
              className={`panel-tab ${leftTab === 'layers' ? 'active' : ''}`}
              onClick={() => setLeftTab('layers')}
            >
              <Layers size={14} />
              Lớp dữ liệu
            </button>
            <button
              type="button"
              className={`panel-tab ${leftTab === 'entities' ? 'active' : ''}`}
              onClick={() => setLeftTab('entities')}
            >
              <Settings2 size={14} />
              Thực thể
            </button>
          </nav>

          {/* Tab Content */}
          {leftTab === 'layers' ? (
            <LayerPanel
              layers={layers}
              statusByLayerId={statusByLayerId}
              loading={loading}
              error={error}
              featuresByLayerId={featuresByLayerId}
              onToggleLayer={(layer) => void toggleLayer(layer)}
              onReloadLayer={(layer) => void loadLayerToMap(layer, true)}
              onZoomLayer={zoomLayer}
              onSaveLayer={(layer) => void updateLayer(layer)}
              onDeleteLayer={(layerId) => void removeLayer(layerId)}
              onSelectFeature={selectFeatureById}
              onZoomFeature={zoomItem}
              onClose={() => setLeftPanelOpen(false)}
            />
          ) : (
            <SpatialEntityPanel
              entities={entities}
              loading={entitiesLoading}
              error={entitiesError}
              pickedCoordinate={pickedCoordinate}
              onClearPickedCoordinate={() => setPickedCoordinate(null)}
              onSaveEntity={(entity) => void upsertEntity(entity)}
              onDeleteEntity={(entityId) => void removeEntity(entityId)}
              onToggleEntity={(entity) => void toggleEntity(entity)}
              onZoomEntity={zoomItem}
              onClose={() => setLeftPanelOpen(false)}
            />
          )}
        </aside>
      ) : (
        <button
          className="toggle-button toggle-button-left"
          type="button"
          onClick={() => setLeftPanelOpen(true)}
          title="Hiện bảng quản lý"
        >
          <MapPinned size={14} />
        </button>
      )}

      {/* ── Right Floating Panel (Inspector) ── */}
      {selectedFeature ? (
        <aside className="floating-panel floating-panel-right" id="right-panel">
          <MapInspector
            feature={selectedFeature}
            onClose={closeInspector}
            onZoom={zoomItem}
            onToggleModel={toggleSelectedModel}
          />
        </aside>
      ) : null}
      </div>
    </div>
  )
}

function resolveLayerGeojsonUrl(layer: LayerConfig): string {
  if (layer.sourceType === 'local-geojson') {
    if (!layer.geojsonFile) {
      throw new Error('Layer local thiếu geojsonFile.')
    }
    return layer.geojsonFile
  }

  if (!layer.geojsonUrl) {
    throw new Error('Layer remote thiếu geojsonUrl.')
  }

  return layer.sourceType === 'arcgis-query-url' ? buildArcgisGeojsonQueryUrl(layer.geojsonUrl) : layer.geojsonUrl
}
