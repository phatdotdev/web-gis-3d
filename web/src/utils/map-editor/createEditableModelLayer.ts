import Graphic from '@arcgis/core/Graphic'
import FeatureLayer from '@arcgis/core/layers/FeatureLayer'
import SimpleRenderer from '@arcgis/core/renderers/SimpleRenderer'
import ObjectSymbol3DLayer from '@arcgis/core/symbols/ObjectSymbol3DLayer'
import PointSymbol3D from '@arcgis/core/symbols/PointSymbol3D'
import type { NormalizedSpatialFeature } from '../../types/map'
import { spatialFeatureToEditableGraphic } from './entityFeatureAdapter'

export function createEditableModelLayers(features: NormalizedSpatialFeature[]): FeatureLayer[] {
  const groups = new Map<string, Graphic[]>()
  let objectId = 1

  features.forEach((feature) => {
    const graphic = spatialFeatureToEditableGraphic(feature, objectId)
    if (!graphic) {
      return
    }
    objectId += 1
    const modelUrl = String(graphic.attributes.MODEL_URL)
    const graphics = groups.get(modelUrl) ?? []
    graphics.push(graphic)
    groups.set(modelUrl, graphics)
  })

  return [...groups.entries()].map(([modelUrl, graphics], index) =>
    new FeatureLayer({
      id: `app-editable-models-${index}`,
      title: `Editable 3D models ${index + 1}`,
      source: graphics,
      objectIdField: 'OBJECTID',
      geometryType: 'point',
      spatialReference: { wkid: 4326 },
      elevationInfo: { mode: 'absolute-height' },
      fields: [
        { name: 'OBJECTID', alias: 'OBJECTID', type: 'oid' },
        { name: 'ENTITY_ID', alias: 'Entity ID', type: 'string' },
        { name: 'LAYER_ID', alias: 'Layer ID', type: 'string' },
        { name: 'NAME', alias: 'Name', type: 'string' },
        { name: 'TYPE', alias: 'Type', type: 'string' },
        { name: 'SIZE', alias: 'Size', type: 'double' },
        { name: 'ROTATION', alias: 'Rotation', type: 'double' },
        { name: 'ELEVATION', alias: 'Elevation', type: 'double' },
        { name: 'MODEL_URL', alias: 'Model URL', type: 'string' },
        { name: 'COLOR', alias: 'Color', type: 'string' },
      ],
      outFields: ['*'],
      renderer: new SimpleRenderer({
        symbol: new PointSymbol3D({
          symbolLayers: [
            new ObjectSymbol3DLayer({
              resource: { href: modelUrl },
              width: 5,
              depth: 5,
              height: 5,
            }),
          ],
        }),
        visualVariables: [
          {
            type: 'size',
            field: 'SIZE',
            axis: 'height',
            valueUnit: 'meters',
          },
          {
            type: 'rotation',
            field: 'ROTATION',
          },
        ],
      }),
    }),
  )
}
