import IconSymbol3DLayer from '@arcgis/core/symbols/IconSymbol3DLayer'
import LineSymbol3D from '@arcgis/core/symbols/LineSymbol3D'
import ObjectSymbol3DLayer from '@arcgis/core/symbols/ObjectSymbol3DLayer'
import PathSymbol3DLayer from '@arcgis/core/symbols/PathSymbol3DLayer'
import PointSymbol3D from '@arcgis/core/symbols/PointSymbol3D'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import type { LineProfile, NormalizedSpatialFeature, ResolvedSpatialStyle } from '../../types/map'
import type { ResolvedModel3DConfig } from '../../types/model3d'
import { createMapPinSymbol3D } from './pinSymbolFactory'

type HighlightSymbol = PointSymbol3D | SimpleMarkerSymbol | SimpleLineSymbol | SimpleFillSymbol

export { createMapPinSymbol3D }

/**
 * Pin symbol đẹp — dùng PointSymbol3D + IconSymbol3DLayer cho SceneView,
 * hiển thị pin nổi trên mặt đất.
 */
export function createPinSymbol3D(style: ResolvedSpatialStyle): PointSymbol3D {
  return createMapPinSymbol3D(style.pinColor, 34)
}

/**
 * Fallback 2D marker dùng cho highlight hoặc khi SceneView chưa sẵn sàng
 */
export function createPinSymbol(style: ResolvedSpatialStyle): SimpleMarkerSymbol {
  return new SimpleMarkerSymbol({
    style: 'circle',
    color: style.pinColor,
    size: 12,
    outline: {
      color: '#ffffff',
      width: 1.5,
    },
  })
}

/**
 * LineString 3D symbol — dùng PathSymbol3DLayer trong SceneView để render
 * dạng ống tròn (profile: "circle") hoặc khối vuông (profile: "quad").
 *
 * ArcGIS JS SDK PathSymbol3DLayer hỗ trợ profile "circle" và "quad" native.
 */
export function createLineSymbol3D(style: ResolvedSpatialStyle): LineSymbol3D {
  const profile = mapLineProfile(style.lineProfile)
  return new LineSymbol3D({
    symbolLayers: [
      new PathSymbol3DLayer({
        profile,
        material: { color: style.lineColor },
        width: style.lineWidth,
        height: style.lineHeight,
        join: 'round',
        cap: style.lineCap === 'square' ? 'square' : 'round',
        // profileRotation: "heading" — line xoay theo hướng, mặc định
      }),
    ],
  })
}

/**
 * Fallback 2D line symbol
 */
export function createLineSymbol(style: ResolvedSpatialStyle): SimpleLineSymbol {
  return new SimpleLineSymbol({
    color: style.lineColor,
    width: style.lineWidth,
    style: 'solid',
    cap: style.lineCap === 'square' ? 'square' : 'round',
    join: 'round',
  })
}

export function createPolygonSymbol(style: ResolvedSpatialStyle): SimpleFillSymbol {
  return new SimpleFillSymbol({
    color: withOpacity(style.polygonFillColor, style.polygonOpacity),
    outline: {
      color: style.polygonOutlineColor,
      width: 1.5,
    },
  })
}

export function createHighlightSymbol(feature: NormalizedSpatialFeature): HighlightSymbol {
  if (feature.geometryType === 'Point') {
    return new PointSymbol3D({
      symbolLayers: [
        new IconSymbol3DLayer({
          resource: { primitive: 'circle' },
          material: { color: [0, 137, 123, 0.22] },
          outline: {
            color: '#00897b',
            size: 2.5,
          },
          size: feature.model3D?.enabled ? 52 : 42,
        }),
      ],
      verticalOffset: {
        screenLength: feature.model3D?.enabled ? 8 : 24,
        maxWorldLength: 180,
        minWorldLength: 0,
      },
    })
  }

  if (feature.geometryType === 'LineString' || feature.geometryType === 'MultiLineString') {
    return new SimpleLineSymbol({
      color: '#00897b',
      width: Math.max(feature.style.lineWidth + 3, 6),
      style: 'solid',
    })
  }

  return new SimpleFillSymbol({
    color: [0, 137, 123, 0.12],
    outline: {
      color: '#00897b',
      width: 3,
    },
  })
}

export function createModelSymbol3D(model3D: ResolvedModel3DConfig): PointSymbol3D | null {
  if (!model3D.modelUrl) {
    return null
  }

  const scale = model3D.scale ?? { x: 5, y: 5, z: 5 }
  const rotation = model3D.rotation ?? { x: 0, y: 0, z: 0 }

  return new PointSymbol3D({
    symbolLayers: [
      new ObjectSymbol3DLayer({
        resource: { href: model3D.modelUrl },
        width: scale.x,
        depth: scale.y,
        height: scale.z,
        heading: rotation.z,
        tilt: rotation.x,
        roll: rotation.y,
      }),
    ],
  })
}

function withOpacity(hex: string, opacity: number): number[] | string {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) {
    return hex
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return [red, green, blue, opacity]
}

/**
 * Map LineProfile enum → ArcGIS PathSymbol3DLayer profile.
 * ArcGIS JS SDK PathSymbol3DLayer trực tiếp hỗ trợ "circle" và "quad".
 */
function mapLineProfile(profile: LineProfile): 'circle' | 'quad' {
  if (profile === 'quad') return 'quad'
  return 'circle'
}
