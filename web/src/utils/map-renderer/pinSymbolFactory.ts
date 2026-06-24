import IconSymbol3DLayer from '@arcgis/core/symbols/IconSymbol3DLayer'
import PointSymbol3D from '@arcgis/core/symbols/PointSymbol3D'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol'
import type { ResolvedSpatialStyle } from '../../types/map'

const MAP_PIN_SVG = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64">
  <path fill="#000" fill-rule="evenodd" d="M24 63S6 40.8 6 24C6 10.7 14.1 2 24 2s18 8.7 18 22c0 16.8-18 39-18 39Zm0-27a12 12 0 1 0 0-24 12 12 0 0 0 0 24Z"/>
</svg>
`)

const MAP_PIN_HREF = `data:image/svg+xml;charset=UTF-8,${MAP_PIN_SVG}`

export function createMapPinSymbol3D(color: string, size = 34): PointSymbol3D {
  return new PointSymbol3D({
    symbolLayers: [
      new IconSymbol3DLayer({
        resource: { href: MAP_PIN_HREF },
        material: { color },
        outline: {
          color: '#ffffff',
          size: 1,
        },
        size,
      }),
    ],
    verticalOffset: {
      screenLength: Math.round(size * 0.75),
      maxWorldLength: 220,
      minWorldLength: 18,
    },
    callout: {
      type: 'line',
      color,
      size: 1,
      border: {
        color: [255, 255, 255, 0.65],
      },
    },
  })
}

export function createPinSymbol3D(style: ResolvedSpatialStyle): PointSymbol3D {
  return createMapPinSymbol3D(style.pinColor)
}

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
