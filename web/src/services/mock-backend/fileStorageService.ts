import type { GeojsonFeatureCollection } from '../../types/geojson'
import { downloadJson } from '../../utils/file/downloadJson'
import { createStoredObjectUrl } from '../../utils/file/objectUrlStore'
import { loadGeojsonFromUploadedFile } from '../geojson/geojsonLoader'

export type StoredFileRef = {
  id: string
  name: string
  objectUrl?: string
  createdAt: string
}

export async function uploadGeojsonFile(file: File): Promise<StoredFileRef & { collection: GeojsonFeatureCollection }> {
  const collection = await loadGeojsonFromUploadedFile(file)
  const ref = createFileRef(file)
  window.localStorage.setItem(`frontend-gis.upload.geojson.${ref.id}`, JSON.stringify(collection))
  return { ...ref, collection }
}

export async function uploadModelFile(file: File): Promise<StoredFileRef> {
  const ref = {
    ...createFileRef(file),
    objectUrl: createStoredObjectUrl(file),
  }
  window.localStorage.setItem(`frontend-gis.upload.model.${ref.id}`, JSON.stringify(ref))
  return ref
}

export function exportCurrentDataAsJson(data: unknown): void {
  downloadJson(`frontend-gis-export-${new Date().toISOString().slice(0, 10)}.json`, data)
}

function createFileRef(file: File): StoredFileRef {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    createdAt: new Date().toISOString(),
  }
}
