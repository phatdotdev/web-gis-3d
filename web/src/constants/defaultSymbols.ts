import type { ResolvedSpatialStyle } from '../types/map'
import type { Model3DConfig } from '../types/model3d'

export const defaultSpatialStyle: ResolvedSpatialStyle = {
  pinColor: '#00897b',
  pinIcon: 'map-pin',
  lineColor: '#004c97',
  lineWidth: 3,
  lineHeight: 3,
  lineProfile: 'circle',
  lineZ: 0,
  lineCap: 'round',
  polygonFillColor: '#00897b',
  polygonOutlineColor: '#003865',
  polygonOpacity: 0.3,
}

export const defaultModel3D: Model3DConfig = {
  enabled: false,
  modelUrl: '/data/models/default-point.glb',
  scale: { x: 5, y: 5, z: 5 },
  rotation: { x: 0, y: 0, z: 0 },
  altitudeOffset: 0,
}
