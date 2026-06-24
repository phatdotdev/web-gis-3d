import Graphic from '@arcgis/core/Graphic'
import Point from '@arcgis/core/geometry/Point'
import type { NormalizedSpatialFeature } from '../../types/map'
import type { SpatialEntityConfig } from '../../types/spatialEntity'

export type EditableModelAttributes = {
  OBJECTID: number
  ENTITY_ID: string
  LAYER_ID: string
  NAME: string
  TYPE: string
  SIZE: number
  ROTATION: number
  ELEVATION: number
  MODEL_URL: string
  COLOR: string
}

export function spatialFeatureToEditableGraphic(
  feature: NormalizedSpatialFeature,
  objectId: number,
): Graphic | null {
  if (feature.geometryType !== 'Point' || !Array.isArray(feature.coordinates) || !feature.model3D?.modelUrl) {
    return null
  }

  const longitude = Number(feature.coordinates[0])
  const latitude = Number(feature.coordinates[1])
  const elevation = Number(feature.coordinates[2] ?? 0) + (feature.model3D.altitudeOffset ?? 0)
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null
  }

  return new Graphic({
    geometry: new Point({
      longitude,
      latitude,
      z: Number.isFinite(elevation) ? elevation : 0,
      spatialReference: { wkid: 4326 },
    }),
    attributes: {
      OBJECTID: objectId,
      ENTITY_ID: feature.entityId ?? '',
      LAYER_ID: feature.layerId ?? '',
      NAME: feature.name,
      TYPE: feature.geometryType,
      SIZE: feature.model3D.scale?.x ?? 5,
      ROTATION: feature.model3D.rotation?.z ?? 0,
      ELEVATION: Number.isFinite(elevation) ? elevation : 0,
      MODEL_URL: feature.model3D.modelUrl,
      COLOR: feature.style.pinColor,
    } satisfies EditableModelAttributes,
  })
}

export function updateEntityFromEditedFeature(
  entity: SpatialEntityConfig,
  graphic: Graphic,
): SpatialEntityConfig {
  const geometry = graphic.geometry as Point | null
  const attributes = graphic.attributes as Partial<EditableModelAttributes>
  const longitude = geometry?.longitude ?? readPointCoordinate(entity.geometry.coordinates, 0)
  const latitude = geometry?.latitude ?? readPointCoordinate(entity.geometry.coordinates, 1)
  const elevation = geometry?.z ?? attributes.ELEVATION ?? readPointCoordinate(entity.geometry.coordinates, 2)
  const size = normalizePositiveNumber(attributes.SIZE, entity.model3D?.scale?.x ?? 5)
  const rotation = Number(attributes.ROTATION ?? entity.model3D?.rotation?.z ?? 0)

  return {
    ...entity,
    geometry: {
      ...entity.geometry,
      coordinates: [longitude, latitude, elevation],
    },
    model3D: {
      ...entity.model3D,
      enabled: true,
      modelUrl: attributes.MODEL_URL || entity.model3D?.modelUrl,
      scale: { x: size, y: size, z: size },
      rotation: {
        x: entity.model3D?.rotation?.x ?? 0,
        y: entity.model3D?.rotation?.y ?? 0,
        z: Number.isFinite(rotation) ? rotation : 0,
      },
      altitudeOffset: 0,
    },
  }
}

function readPointCoordinate(coordinates: unknown, index: number): number {
  return Array.isArray(coordinates) && typeof coordinates[index] === 'number' ? coordinates[index] : 0
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback
}
