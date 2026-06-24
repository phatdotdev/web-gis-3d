import '@arcgis/core/assets/esri/themes/light/main.css'

import ArcGISMap from '@arcgis/core/Map'
import Camera from '@arcgis/core/Camera'
import type Graphic from '@arcgis/core/Graphic'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer'
import SceneView from '@arcgis/core/views/SceneView'
import { useEffect, useRef } from 'react'
import type { ArcgisMapContexts } from '../hooks/useArcgisScene'
import { readFeatureIdFromHitTest } from '../../../utils/map-renderer/hitTestUtils'
import { DEFAULT_BASEMAP, DEFAULT_GROUND } from '../constants'

type ArcgisSceneMapProps = {
  onReady: (contexts: ArcgisMapContexts) => void
  onFeatureClick: (featureId: string) => void
  onMapClick?: (point: { longitude: number; latitude: number; z: number }) => void
}

/**
 * Bản đồ ArcGIS 3D full màn hình.
 * SceneView được tạo 1 lần duy nhất, không bao giờ recreate khi toggle/delete/select.
 */
export function ArcgisSceneMap({ onReady, onFeatureClick, onMapClick }: ArcgisSceneMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) {
      return undefined
    }
    initializedRef.current = true

    const layerGraphicsLayer = new GraphicsLayer({ id: 'app-layer-graphics', title: 'Layer graphics' })
    const entityGraphicsLayer = new GraphicsLayer({ id: 'app-entity-graphics', title: 'Entity graphics' })
    const modelLayer = new GraphicsLayer({ id: 'app-model-graphics', title: '3D models' })
    const highlightLayer = new GraphicsLayer({ id: 'app-highlight-graphics', title: 'Selection highlight' })

    const map = new ArcGISMap({
      basemap: DEFAULT_BASEMAP,
      ground: DEFAULT_GROUND,
      layers: [layerGraphicsLayer, entityGraphicsLayer, modelLayer, highlightLayer],
    })

    const view = new SceneView({
      container: containerRef.current,
      map,
      qualityProfile: 'high',
      camera: new Camera({
        position: {
          longitude: 105.7821,
          latitude: 10.0298,
          z: 1800,
        },
        tilt: 62,
        heading: 0,
      }),
      environment: {
        atmosphereEnabled: true,
        starsEnabled: false,
      },
    })

    const graphicIndex = new globalThis.Map<string, Graphic[]>()
    const layerFeatureIndex = new globalThis.Map<string, Set<string>>()
    const entityFeatureIndex = new globalThis.Map<string, Set<string>>()

    onReady({
      layer: {
        view,
        graphicsLayer: layerGraphicsLayer,
        modelLayer,
        highlightLayer,
        graphicIndex,
        layerFeatureIndex,
        entityFeatureIndex,
      },
      entity: {
        view,
        graphicsLayer: entityGraphicsLayer,
        modelLayer,
        highlightLayer,
        graphicIndex,
        layerFeatureIndex,
        entityFeatureIndex,
      },
    })

    const clickHandle = view.on('click', async (event) => {
      const hitTest = await view.hitTest(event)
      const featureId = readFeatureIdFromHitTest(hitTest)
      if (featureId) {
        onFeatureClick(featureId)
      } else if (
        onMapClick &&
        event.mapPoint &&
        typeof event.mapPoint.longitude === 'number' &&
        typeof event.mapPoint.latitude === 'number'
      ) {
        onMapClick({
          longitude: event.mapPoint.longitude,
          latitude: event.mapPoint.latitude,
          z: event.mapPoint.z ?? 0,
        })
      }
    })

    return () => {
      clickHandle.remove()
      view.destroy()
      initializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="arcgis-scene-container" aria-label="Bản đồ ArcGIS 3D" />
}
