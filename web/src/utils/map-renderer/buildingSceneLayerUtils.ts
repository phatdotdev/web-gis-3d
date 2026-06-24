import BuildingSceneLayer from '@arcgis/core/layers/BuildingSceneLayer'
import type SceneView from '@arcgis/core/views/SceneView'

type BuildingSublayerLike = {
  visible: boolean
  modelName?: string | null
}

type BuildingLayerWithSublayers = BuildingSceneLayer & {
  allSublayers?: {
    forEach: (callback: (sublayer: BuildingSublayerLike) => void) => void
  }
}

export function addBuildingSceneLayer(view: SceneView, url: string): BuildingSceneLayer {
  const layer = new BuildingSceneLayer({ url })
  view.map?.add(layer)
  return layer
}

export async function showFullModelHideOverview(buildingLayer: BuildingSceneLayer): Promise<void> {
  await buildingLayer.load()
  const layerWithSublayers = buildingLayer as BuildingLayerWithSublayers
  layerWithSublayers.allSublayers?.forEach((sublayer) => {
    if (sublayer.modelName === 'FullModel') {
      sublayer.visible = true
    }
    if (sublayer.modelName === 'Overview') {
      sublayer.visible = false
    }
  })
}
