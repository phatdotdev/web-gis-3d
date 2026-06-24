import { dataFolders } from '../../constants/folders'
import type { LayerConfig } from '../../types/layer'

const storageKey = 'frontend-gis.layers'

export interface LayerRepository {
  listLayers(): Promise<LayerConfig[]>
  getLayer(layerId: string): Promise<LayerConfig | null>
  saveLayer(layer: LayerConfig): Promise<void>
  deleteLayer(layerId: string): Promise<void>
}

export class LocalLayerRepository implements LayerRepository {
  async listLayers(): Promise<LayerConfig[]> {
    const stored = readStoredLayers()
    if (stored) {
      return stored
    }

    const response = await fetch(dataFolders.layers)
    if (!response.ok) {
      throw new Error('Không đọc được /data/layers/layers.json')
    }
    const layers = (await response.json()) as LayerConfig[]
    writeStoredLayers(layers)
    return layers
  }

  async getLayer(layerId: string): Promise<LayerConfig | null> {
    const layers = await this.listLayers()
    return layers.find((layer) => layer.layerId === layerId) ?? null
  }

  async saveLayer(layer: LayerConfig): Promise<void> {
    const layers = await this.listLayers()
    const existingIndex = layers.findIndex((item) => item.layerId === layer.layerId)
    const nextLayers = [...layers]
    if (existingIndex >= 0) {
      nextLayers[existingIndex] = layer
    } else {
      nextLayers.push(layer)
    }
    writeStoredLayers(nextLayers)
  }

  async deleteLayer(layerId: string): Promise<void> {
    const layers = await this.listLayers()
    writeStoredLayers(layers.filter((layer) => layer.layerId !== layerId))
  }
}

export const layerRepository = new LocalLayerRepository()

function readStoredLayers(): LayerConfig[] | null {
  const raw = window.localStorage.getItem(storageKey)
  return raw ? (JSON.parse(raw) as LayerConfig[]) : null
}

function writeStoredLayers(layers: LayerConfig[]): void {
  window.localStorage.setItem(storageKey, JSON.stringify(layers))
}
