import Point from '@arcgis/core/geometry/Point'
import Polygon from '@arcgis/core/geometry/Polygon'
import Polyline from '@arcgis/core/geometry/Polyline'
import type { GeometryType } from '../../types/map'

const spatialReference = { wkid: 4326 }

export function createPointGeometry(coordinates: unknown, altitudeOffset = 0): Point | null {
  if (!isNumberTuple(coordinates)) {
    return null
  }

  return new Point({
    longitude: coordinates[0],
    latitude: coordinates[1],
    z: (coordinates[2] ?? 0) + altitudeOffset,
    spatialReference,
  })
}

export function createCentroidPoint(
  longitude: number,
  latitude: number,
  z = 0,
  altitudeOffset = 0,
): Point {
  return new Point({
    longitude,
    latitude,
    z: z + altitudeOffset,
    spatialReference,
  })
}

export function createPolylineGeometry(geometryType: GeometryType, coordinates: unknown): Polyline | null {
  const paths = geometryType === 'MultiLineString' ? readNestedLines(coordinates) : [readLine(coordinates)]
  const validPaths = paths.filter((path) => path.length > 1)
  if (validPaths.length === 0) {
    return null
  }

  return new Polyline({
    paths: validPaths,
    spatialReference,
  })
}

export function createPolygonGeometry(geometryType: GeometryType, coordinates: unknown): Polygon | null {
  const rings = geometryType === 'MultiPolygon' ? readMultiPolygonRings(coordinates) : readPolygonRings(coordinates)
  if (rings.length === 0) {
    return null
  }

  return new Polygon({
    rings,
    spatialReference,
  })
}

function readNestedLines(value: unknown): number[][][] {
  return Array.isArray(value) ? value.map(readLine) : []
}

function readPolygonRings(value: unknown): number[][][] {
  return Array.isArray(value) ? value.map(readLine).filter((ring) => ring.length > 2) : []
}

function readMultiPolygonRings(value: unknown): number[][][] {
  return Array.isArray(value) ? value.flatMap(readPolygonRings) : []
}

function readLine(value: unknown): number[][] {
  return Array.isArray(value) ? value.filter(isNumberTuple) : []
}

function isNumberTuple(value: unknown): value is number[] {
  return Array.isArray(value) && typeof value[0] === 'number' && typeof value[1] === 'number'
}
