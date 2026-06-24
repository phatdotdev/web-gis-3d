import { useCallback, useEffect, useState } from 'react'
import type { LayerConfig } from '../../../types/layer'
import { layerRepository } from '../../../services/mock-backend/layerRepository'

export function useLayerManagement() {
  const [layers, setLayers] = useState<LayerConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshLayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLayers(await layerRepository.listLayers())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách lớp dữ liệu.')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveLayer = useCallback(async (layer: LayerConfig) => {
    await layerRepository.saveLayer(layer)
    setLayers(await layerRepository.listLayers())
  }, [])

  const deleteLayer = useCallback(async (layerId: string) => {
    await layerRepository.deleteLayer(layerId)
    setLayers(await layerRepository.listLayers())
  }, [])

  useEffect(() => {
    void refreshLayers()
  }, [refreshLayers])

  return {
    layers,
    loading,
    error,
    refreshLayers,
    saveLayer,
    deleteLayer,
    setLayers,
  }
}
