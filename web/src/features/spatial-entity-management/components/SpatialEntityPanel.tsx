import { Eye, EyeOff, LocateFixed, Pencil, Plus, Save, Trash2, Upload, X, MapPin } from 'lucide-react'
import { useState, useEffect } from 'react'
import { uploadModelFile } from '../../../services/mock-backend/fileStorageService'
import type { SpatialEntityConfig } from '../../../types/spatialEntity'

type SpatialEntityPanelProps = {
  entities: SpatialEntityConfig[]
  loading: boolean
  error: string | null
  pickedCoordinate?: { longitude: number; latitude: number; z: number } | null
  onClearPickedCoordinate?: () => void
  onSaveEntity: (entity: SpatialEntityConfig) => void
  onDeleteEntity: (entityId: string) => void
  onToggleEntity: (entity: SpatialEntityConfig) => void
  onZoomEntity: (entityId: string) => void
  onClose?: () => void
}

type DraftEntity = {
  entityId: string | null
  entityName: string
  geometryType: 'Point' | 'LineString' | 'Polygon'
  coordinatesText: string
  elevationZ: number
  pinColor: string
  lineProfile: 'circle' | 'quad'
  modelUrl: string
  modelSize: number
  modelHeading: number
  description: string
}

const defaultDraft: DraftEntity = {
  entityId: null,
  entityName: '',
  geometryType: 'Point',
  coordinatesText: '[105.7826, 10.0315, 0]',
  elevationZ: 0,
  pinColor: '#c62828',
  lineProfile: 'circle',
  modelUrl: '',
  modelSize: 5,
  modelHeading: 0,
  description: '',
}

export function SpatialEntityPanel({
  entities,
  loading,
  error,
  onSaveEntity,
  onDeleteEntity,
  onToggleEntity,
  onZoomEntity,
  pickedCoordinate,
  onClearPickedCoordinate,
  onClose,
}: SpatialEntityPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPickingLocation, setIsPickingLocation] = useState(false)
  const [draft, setDraft] = useState<DraftEntity>(defaultDraft)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (isPickingLocation && pickedCoordinate && draft.geometryType === 'Point') {
      queueMicrotask(() => {
        setDraft((d) => ({
          ...d,
          coordinatesText: `[${pickedCoordinate.longitude.toFixed(6)}, ${pickedCoordinate.latitude.toFixed(6)}, ${d.elevationZ}]`,
        }))
        setIsPickingLocation(false)
        onClearPickedCoordinate?.()
      })
    }
  }, [isPickingLocation, pickedCoordinate, draft.geometryType, onClearPickedCoordinate])

  function openAddForm() {
    setDraft(defaultDraft)
    setFormError(null)
    setIsFormOpen(true)
  }

  function openEditForm(entity: SpatialEntityConfig) {
    setDraft({
      entityId: entity.entityId,
      entityName: entity.entityName,
      geometryType: entity.geometry.type,
      coordinatesText: JSON.stringify(entity.geometry.coordinates),
      elevationZ: Array.isArray(entity.geometry.coordinates) && entity.geometry.coordinates.length > 2 ? Number(entity.geometry.coordinates[2]) : 0,
      pinColor: entity.style.pinColor ?? '#c62828',
      lineProfile: entity.style.lineProfile ?? 'circle',
      modelUrl: entity.model3D?.modelUrl ?? '',
      modelSize: entity.model3D?.scale?.x ?? 5,
      modelHeading: entity.model3D?.rotation?.z ?? 0,
      description: entity.description ?? '',
    })
    setFormError(null)
    setIsFormOpen(true)
  }

  function submitDraft() {
    setFormError(null)
    try {
      const coordinates = JSON.parse(draft.coordinatesText) as unknown
      const entityId = draft.entityId ?? `entity-${crypto.randomUUID().slice(0, 8)}`
      const existingEntity = entities.find((e) => e.entityId === entityId)
      const entity: SpatialEntityConfig = {
        entityId,
        entityName: draft.entityName.trim() || `Thực thể ${entities.length + 1}`,
        description: draft.description,
        geometry: {
          type: draft.geometryType,
          coordinates,
        },
        visible: existingEntity?.visible ?? true,
        style: {
          ...(existingEntity?.style ?? {}),
          pinColor: draft.pinColor,
          pinIcon: 'custom',
          lineColor: draft.pinColor,
          lineWidth: existingEntity?.style.lineWidth ?? 4,
          lineHeight: existingEntity?.style.lineHeight ?? 4,
          lineProfile: draft.lineProfile,
          lineZ: existingEntity?.style.lineZ ?? 0,
          lineCap: 'round',
          polygonFillColor: draft.pinColor,
          polygonOutlineColor: '#003865',
          polygonOpacity: existingEntity?.style.polygonOpacity ?? 0.3,
        },
        model3D: {
          enabled: !!draft.modelUrl,
          modelUrl: draft.modelUrl || undefined,
          scale: { x: draft.modelSize, y: draft.modelSize, z: draft.modelSize },
          rotation: { x: existingEntity?.model3D?.rotation?.x ?? 0, y: existingEntity?.model3D?.rotation?.y ?? 0, z: draft.modelHeading },
          altitudeOffset: existingEntity?.model3D?.altitudeOffset ?? 0,
        },
        metadata: existingEntity?.metadata ?? {
          createdBy: 'frontend-mock',
        },
      }
      onSaveEntity(entity)
      setDraft(defaultDraft)
      setIsFormOpen(false)
    } catch {
      setFormError('Coordinates phải là JSON hợp lệ.')
    }
  }

  return (
    <div className="panel-content">
      {onClose && (
        <button className="icon-button panel-close-button" type="button" onClick={onClose} title="Đóng panel">
          <X size={16} />
        </button>
      )}
      <div className="panel-section-header">
        <div>
          <h2 className="section-title">Quản lý thực thể</h2>
          <p className="label mt-1">{entities.length} thực thể</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" type="button" onClick={openAddForm}>
            <Plus size={14} />
            Thêm thực thể
          </button>
        </div>
      </div>

      {loading ? <p className="empty-line">Đang tải dữ liệu...</p> : null}
      {error ? <p className="error-line">{error}</p> : null}
      {!loading && entities.length === 0 ? <p className="empty-line">Không có dữ liệu</p> : null}

      {/* Add / Edit Form */}
      {isFormOpen ? (
        <div className="form-card">
          <div className="flex items-center justify-between mb-2">
            <span className="label">{draft.entityId ? 'Sửa thực thể' : 'Thêm thực thể mới'}</span>
            <button className="icon-button" type="button" onClick={() => setIsFormOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Tên thực thể</label>
            <input
              className="input"
              value={draft.entityName}
              onChange={(e) => setDraft((d) => ({ ...d, entityName: e.target.value }))}
              placeholder="Ví dụ: Trạm quan trắc mới"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả</label>
            <input
              className="input"
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Mô tả ngắn..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Loại hình học</label>
            <select
              className="input"
              value={draft.geometryType}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  geometryType: e.target.value as DraftEntity['geometryType'],
                  coordinatesText: getCoordinateExample(e.target.value as DraftEntity['geometryType']),
                }))
              }
            >
              <option value="Point">Point</option>
              <option value="LineString">LineString</option>
              <option value="Polygon">Polygon</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tọa độ JSON</label>
            {draft.geometryType === 'Point' && (
              <div className="flex gap-2 mb-2">
                <button 
                  className={`btn-secondary text-[12px] h-8 px-2 py-1 ${isPickingLocation ? 'bg-[var(--color-surface-alt)] border-[var(--color-teal)]' : ''}`} 
                  type="button" 
                  onClick={() => {
                    const next = !isPickingLocation
                    setIsPickingLocation(next)
                    if (!next) onClearPickedCoordinate?.()
                  }}
                >
                  <MapPin size={14} />
                  {isPickingLocation ? 'Đang chọn điểm trên bản đồ...' : 'Chọn vị trí trên bản đồ'}
                </button>
              </div>
            )}
            <textarea
              className="input min-h-20 font-mono text-[11px]"
              value={draft.coordinatesText}
              onChange={(e) => setDraft((d) => ({ ...d, coordinatesText: e.target.value }))}
              disabled={isPickingLocation}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <div className="form-group flex-1">
              <label className="form-label">Độ cao (Z)</label>
              <input
                className="input h-9"
                type="number"
                value={draft.elevationZ}
                onChange={(e) => {
                  const z = Number(e.target.value)
                  setDraft((d) => {
                    let newText = d.coordinatesText
                    if (d.geometryType === 'Point') {
                      try {
                        const arr = JSON.parse(d.coordinatesText)
                        if (Array.isArray(arr) && arr.length >= 2) {
                          newText = `[${arr[0]}, ${arr[1]}, ${z}]`
                        }
                      } catch {
                        newText = d.coordinatesText
                      }
                    }
                    return { ...d, elevationZ: z, coordinatesText: newText }
                  })
                }}
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Màu sắc</label>
              <input
                className="input h-9"
                type="color"
                value={draft.pinColor}
                onChange={(e) => setDraft((d) => ({ ...d, pinColor: e.target.value }))}
              />
            </div>
            {draft.geometryType === 'LineString' && (
              <div className="form-group flex-1">
                <label className="form-label">Profile</label>
                <select
                  className="input h-9"
                  value={draft.lineProfile}
                  onChange={(e) => setDraft((d) => ({ ...d, lineProfile: e.target.value as 'circle' | 'quad' }))}
                >
                  <option value="circle">Tròn</option>
                  <option value="quad">Vuông</option>
                </select>
              </div>
            )}
          </div>
          {draft.geometryType === 'Point' && (
            <div className="form-group mt-2">
              <label className="form-label">Mô hình 3D (.glb)</label>
              <input
                className="input text-[13px] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-surface-alt)] file:text-[var(--color-navy)] hover:file:bg-[var(--color-border)] cursor-pointer"
                type="file"
                accept=".glb,model/gltf-binary"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const ref = await uploadModelFile(file)
                    setDraft((d) => ({ ...d, modelUrl: ref.objectUrl ?? '' }))
                  } catch (err) {
                    console.error('Lỗi upload mô hình:', err)
                    alert('Lỗi upload mô hình 3D')
                  }
                }}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="form-label">Size (m)</label>
                  <input
                    className="input h-9"
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={draft.modelSize}
                    onChange={(e) => setDraft((d) => ({ ...d, modelSize: Math.max(Number(e.target.value) || 0.1, 0.1) }))}
                  />
                </div>
                <div>
                  <label className="form-label">Heading</label>
                  <input
                    className="input h-9"
                    type="number"
                    step="1"
                    value={draft.modelHeading}
                    onChange={(e) => setDraft((d) => ({ ...d, modelHeading: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              {draft.modelUrl && (
                <p className="mt-1 text-xs text-[var(--color-success)] truncate">Mô hình: {draft.modelUrl}</p>
              )}
            </div>
          )}
          {formError ? <p className="error-line mt-2">{formError}</p> : null}
          <button className="btn-primary mt-3 w-full justify-center" type="button" onClick={submitDraft}>
            <Save size={14} />
            {draft.entityId ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      ) : null}

      {/* Entity List */}
      <div className="space-y-2">
        {entities.map((entity) => (
          <article key={entity.entityId} className="list-row">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="color-swatch" style={{ backgroundColor: entity.style.pinColor }} />
                <h3 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {entity.entityName}
                </h3>
                <span className="badge-geometry">{entity.geometry.type}</span>
              </div>
              <button className="icon-button" type="button" onClick={() => onToggleEntity(entity)} title={entity.visible ? 'Ẩn' : 'Hiển thị'}>
                {entity.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </div>

            {entity.description ? (
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)] truncate">{entity.description}</p>
            ) : null}

            <div className="mt-2 flex items-center gap-1">
              <button className="icon-button" type="button" onClick={() => openEditForm(entity)} title="Sửa">
                <Pencil size={14} />
              </button>
              <button className="icon-button" type="button" onClick={() => onZoomEntity(entity.entityId)} title="Phóng tới">
                <LocateFixed size={14} />
              </button>
              <ModelUploadButton entity={entity} onSaveEntity={onSaveEntity} />
              <button className="icon-button" type="button" onClick={() => onDeleteEntity(entity.entityId)} title="Xóa" style={{ color: 'var(--color-error)' }}>
                <Trash2 size={14} />
              </button>
              <span className={entity.visible ? 'status-dot-on ml-auto' : 'status-dot-off ml-auto'} />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function getCoordinateExample(geometryType: DraftEntity['geometryType']): string {
  if (geometryType === 'LineString') {
    return '[[105.7742,10.0321],[105.7796,10.0312],[105.785,10.0336]]'
  }
  if (geometryType === 'Polygon') {
    return '[[[105.7882,10.0247],[105.7938,10.0244],[105.7944,10.0204],[105.7882,10.0247]]]'
  }
  return '[105.7826,10.0315,0]'
}

function ModelUploadButton({
  entity,
  onSaveEntity,
}: {
  entity: SpatialEntityConfig
  onSaveEntity: (entity: SpatialEntityConfig) => void
}) {
  async function handleFile(file: File | undefined) {
    if (!file) {
      return
    }

    const ref = await uploadModelFile(file)
    onSaveEntity({
      ...entity,
      model3D: {
        ...entity.model3D,
        enabled: true,
        modelUrl: ref.objectUrl,
        scale: entity.model3D?.scale ?? { x: 5, y: 5, z: 5 },
        rotation: entity.model3D?.rotation ?? { x: 0, y: 0, z: 0 },
        altitudeOffset: entity.model3D?.altitudeOffset ?? 0,
      },
    })
  }

  return (
    <label className="icon-button cursor-pointer" title="Tải model GLB">
      <Upload size={14} />
      <input className="hidden" type="file" accept=".glb,model/gltf-binary" onChange={(e) => void handleFile(e.target.files?.[0])} />
    </label>
  )
}
