import { useCallback, useEffect, useState } from 'react'
import { spatialEntityRepository } from '../../../services/mock-backend/spatialEntityRepository'
import type { SpatialEntityConfig } from '../../../types/spatialEntity'

export function useSpatialEntityManagement() {
  const [entities, setEntities] = useState<SpatialEntityConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshEntities = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEntities(await spatialEntityRepository.listEntities())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được danh sách thực thể.')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveEntity = useCallback(async (entity: SpatialEntityConfig) => {
    await spatialEntityRepository.saveEntity(entity)
    setEntities(await spatialEntityRepository.listEntities())
  }, [])

  const deleteEntity = useCallback(async (entityId: string) => {
    await spatialEntityRepository.deleteEntity(entityId)
    setEntities(await spatialEntityRepository.listEntities())
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshEntities()
    })
  }, [refreshEntities])

  return {
    entities,
    loading,
    error,
    saveEntity,
    deleteEntity,
    setEntities,
    refreshEntities,
  }
}
