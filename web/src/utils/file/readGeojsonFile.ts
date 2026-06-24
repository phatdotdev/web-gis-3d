import type { GeojsonFeatureCollection } from '../../types/geojson'
import { readJsonFile } from './readJsonFile'

export function readGeojsonFile(file: File): Promise<GeojsonFeatureCollection> {
  return readJsonFile<GeojsonFeatureCollection>(file)
}
