import { dataFolders } from '../../constants/folders'
import type { SpatialEntityConfig } from '../../types/spatialEntity'

const storageKey = 'frontend-gis.entities'

export interface SpatialEntityRepository {
  listEntities(): Promise<SpatialEntityConfig[]>
  saveEntity(entity: SpatialEntityConfig): Promise<void>
  deleteEntity(entityId: string): Promise<void>
}

export class LocalSpatialEntityRepository implements SpatialEntityRepository {
  async listEntities(): Promise<SpatialEntityConfig[]> {
    const stored = readStoredEntities()
    if (stored) {
      return stored
    }

    const response = await fetch(dataFolders.entities)
    if (!response.ok) {
      throw new Error('Không đọc được /data/entities/spatial-entities.json')
    }
    const entities = (await response.json()) as SpatialEntityConfig[]
    writeStoredEntities(entities)
    return entities
  }

  async saveEntity(entity: SpatialEntityConfig): Promise<void> {
    const entities = await this.listEntities()
    const existingIndex = entities.findIndex((item) => item.entityId === entity.entityId)
    const nextEntities = [...entities]
    if (existingIndex >= 0) {
      nextEntities[existingIndex] = entity
    } else {
      nextEntities.push(entity)
    }
    writeStoredEntities(nextEntities)
  }

  async deleteEntity(entityId: string): Promise<void> {
    const entities = await this.listEntities()
    writeStoredEntities(entities.filter((entity) => entity.entityId !== entityId))
  }
}

export const spatialEntityRepository = new LocalSpatialEntityRepository()

function readStoredEntities(): SpatialEntityConfig[] | null {
  const raw = window.localStorage.getItem(storageKey)
  return raw ? (JSON.parse(raw) as SpatialEntityConfig[]) : null
}

function writeStoredEntities(entities: SpatialEntityConfig[]): void {
  window.localStorage.setItem(storageKey, JSON.stringify(entities))
}
