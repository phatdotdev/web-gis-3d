import type Editor from '@arcgis/core/widgets/Editor'
import type FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import type Graphic from '@arcgis/core/Graphic'
import type SceneView from '@arcgis/core/views/SceneView'
import { useEffect } from 'react'
import type { NormalizedSpatialFeature } from '../../../types/map'
import type { SpatialEntityConfig } from '../../../types/spatialEntity'
import { createEditableModelLayers } from '../../../utils/map-editor/createEditableModelLayer'
import { updateEntityFromEditedFeature } from '../../../utils/map-editor/entityFeatureAdapter'

type UseEditable3DModelsOptions = {
  enabled: boolean
  view: SceneView | null
  features: NormalizedSpatialFeature[]
  entities: SpatialEntityConfig[]
  onEntityEdited: (entity: SpatialEntityConfig) => void
}

export function useEditable3DModels({
  enabled,
  view,
  features,
  entities,
  onEntityEdited,
}: UseEditable3DModelsOptions): void {
  useEffect(() => {
    if (!enabled || !view || features.length === 0) {
      return undefined
    }

    let editor: Editor | null = null
    const editableLayers: FeatureLayer[] = createEditableModelLayers(features)
    const handles: Array<{ remove: () => void }> = []
    const entityById = new Map(entities.map((entity) => [entity.entityId, entity]))

    async function mountEditor() {
      const { default: EditorWidget } = await import('@arcgis/core/widgets/Editor')
      if (!view?.map || editableLayers.length === 0) {
        return
      }

      view.map.addMany(editableLayers)
      editableLayers.forEach((layer) => {
        handles.push(
          layer.on('edits', (event) => {
            const objectIds = event.updatedFeatures
              .map((feature) => feature.objectId)
              .filter((objectId): objectId is number => typeof objectId === 'number')
            void syncEditedObjectIds(layer, objectIds, entityById, onEntityEdited)
          }),
        )
      })

      editor = new EditorWidget({
        view,
        layerInfos: editableLayers.map((layer) => ({
          layer,
          enabled: true,
          addEnabled: true,
          updateEnabled: true,
          deleteEnabled: false,
        })),
      })
      view.ui.add(editor, 'top-right')
    }

    void mountEditor()

    return () => {
      handles.forEach((handle) => handle.remove())
      if (editor) {
        view.ui.remove(editor)
        editor.destroy()
      }
      editableLayers.forEach((layer) => view.map?.remove(layer))
    }
  }, [enabled, entities, features, onEntityEdited, view])
}

async function syncEditedObjectIds(
  layer: FeatureLayer,
  objectIds: number[],
  entityById: Map<string, SpatialEntityConfig>,
  onEntityEdited: (entity: SpatialEntityConfig) => void,
): Promise<void> {
  if (objectIds.length === 0) {
    return
  }

  const results = await layer.queryFeatures({
    objectIds,
    outFields: ['*'],
    returnGeometry: true,
  })

  results.features.forEach((graphic: Graphic) => {
    const entityId = typeof graphic.attributes?.ENTITY_ID === 'string' ? graphic.attributes.ENTITY_ID : ''
    if (!entityId) {
      const layerId = typeof graphic.attributes?.LAYER_ID === 'string' ? graphic.attributes.LAYER_ID : ''
      console.warn('[map-editor] Edited layer model is not persisted to GeoJSON in frontend-only mode.', { layerId })
      return
    }

    const entity = entityById.get(entityId)
    if (!entity) {
      console.warn('[map-editor] Edited entity model could not be synced because entity was not found.', { entityId })
      return
    }

    onEntityEdited(updateEntityFromEditedFeature(entity, graphic))
  })
}
