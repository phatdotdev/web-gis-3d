import {
  ChevronDown,
  ChevronRight,
  Database,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useState } from 'react'
import type { LayerConfig, LayerSourceType } from '../../../types/layer'
import type { NormalizedSpatialFeature } from '../../../types/map'
import { uploadGeojsonFile, uploadModelFile } from '../../../services/mock-backend/fileStorageService'

export type LayerRuntimeStatus = {
  loaded: number
  loading: boolean
  progress: number
  error?: string
}

type LayerPanelProps = {
  layers: LayerConfig[]
  statusByLayerId: Record<string, LayerRuntimeStatus>
  loading: boolean
  error: string | null
  /** Cached features per layer for showing children */
  featuresByLayerId: Map<string, NormalizedSpatialFeature[]>
  onToggleLayer: (layer: LayerConfig) => void
  onReloadLayer: (layer: LayerConfig) => void
  onZoomLayer: (layerId: string) => void
  onSaveLayer: (layer: LayerConfig) => void
  onDeleteLayer: (layerId: string) => void
  onSelectFeature: (featureId: string) => void
  onZoomFeature: (featureId: string) => void
  onClose?: () => void
}

type DraftLayer = {
  layerName: string
  sourceType: LayerSourceType
  geojsonUrl: string
  geojsonFile: string
  geometryType: string
  pinColor: string
  lineProfile: 'circle' | 'quad'
  modelUrl: string
}

const defaultDraft: DraftLayer = {
  layerName: '',
  sourceType: 'local-geojson',
  geojsonUrl: '',
  geojsonFile: '/data/geojson/sample-point.geojson',
  geometryType: 'Point',
  pinColor: '#00897b',
  lineProfile: 'circle',
  modelUrl: '',
}

export function LayerPanel({
  layers,
  statusByLayerId,
  loading,
  error,
  featuresByLayerId,
  onToggleLayer,
  onReloadLayer,
  onZoomLayer,
  onSaveLayer,
  onDeleteLayer,
  onSelectFeature,
  onZoomFeature,
  onClose,
}: LayerPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DraftLayer>(defaultDraft)
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null)

  function openAddForm() {
    setEditingLayerId(null)
    setDraft(defaultDraft)
    setIsFormOpen(true)
  }

  function openEditForm(layer: LayerConfig) {
    setEditingLayerId(layer.layerId)
    setDraft({
      layerName: layer.layerName,
      sourceType: layer.sourceType,
      geojsonUrl: layer.geojsonUrl ?? '',
      geojsonFile: layer.geojsonFile ?? '',
      geometryType: layer.geometryType ?? 'Point',
      pinColor: layer.style.pinColor ?? '#00897b',
      lineProfile: layer.style.lineProfile ?? 'circle',
      modelUrl: layer.model3D?.modelUrl ?? '',
    })
    setIsFormOpen(true)
  }

  function submitForm() {
    const layerId = editingLayerId ?? `layer-${crypto.randomUUID().slice(0, 8)}`
    const existingLayer = layers.find((l) => l.layerId === layerId)
    const layer: LayerConfig = {
      ...existingLayer,
      layerId,
      layerName: draft.layerName.trim() || `Lớp dữ liệu ${layers.length + 1}`,
      sourceType: draft.sourceType,
      geojsonUrl: draft.sourceType !== 'local-geojson' ? draft.geojsonUrl : undefined,
      geojsonFile: draft.sourceType === 'local-geojson' ? draft.geojsonFile : undefined,
      geometryType: draft.geometryType as LayerConfig['geometryType'],
      visible: existingLayer?.visible ?? true,
      style: {
        ...(existingLayer?.style ?? {}),
        pinColor: draft.pinColor,
        lineColor: draft.pinColor,
        polygonFillColor: draft.pinColor,
        polygonOutlineColor: '#003865',
        lineWidth: existingLayer?.style.lineWidth ?? 4,
        lineHeight: existingLayer?.style.lineHeight ?? 4,
        lineProfile: draft.lineProfile,
        lineZ: existingLayer?.style.lineZ ?? 0,
        polygonOpacity: existingLayer?.style.polygonOpacity ?? 0.3,
      },
      model3D: {
        enabled: !!draft.modelUrl,
        modelUrl: draft.modelUrl || undefined,
        scale: existingLayer?.model3D?.scale ?? { x: 5, y: 5, z: 5 },
        rotation: existingLayer?.model3D?.rotation ?? { x: 0, y: 0, z: 0 },
        altitudeOffset: existingLayer?.model3D?.altitudeOffset ?? 0,
      },
    }
    onSaveLayer(layer)
    setIsFormOpen(false)
    setEditingLayerId(null)
    setDraft(defaultDraft)
  }

  return (
    <div className="panel-content">
      <div className="panel-section-header">
        <div>
          <h2 className="section-title">Quản lý lớp dữ liệu</h2>
          <p className="label mt-1">{layers.length} lớp</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary" type="button" onClick={openAddForm}>
            <Plus size={14} />
            Thêm lớp dữ liệu
          </button>
          {onClose && (
            <button className="icon-button" type="button" onClick={onClose} title="Đóng panel">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {loading ? <p className="empty-line">Đang tải dữ liệu...</p> : null}
      {error ? <p className="error-line">{error}</p> : null}
      {!loading && layers.length === 0 ? <p className="empty-line">Không có dữ liệu</p> : null}

      {/* Add / Edit Form */}
      {isFormOpen ? (
        <div className="form-card">
          <div className="flex items-center justify-between mb-2">
            <span className="label">{editingLayerId ? 'Sửa lớp dữ liệu' : 'Thêm lớp dữ liệu mới'}</span>
            <button className="icon-button" type="button" onClick={() => setIsFormOpen(false)}>
              <X size={14} />
            </button>
          </div>
          <div className="form-group">
            <label className="form-label">Tên lớp</label>
            <input
              className="input"
              value={draft.layerName}
              onChange={(e) => setDraft((d) => ({ ...d, layerName: e.target.value }))}
              placeholder="Ví dụ: Cây xanh đô thị"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Nguồn dữ liệu</label>
            <select
              className="input"
              value={draft.sourceType}
              onChange={(e) => setDraft((d) => ({ ...d, sourceType: e.target.value as LayerSourceType }))}
            >
              <option value="local-geojson">GeoJSON local</option>
              <option value="remote-geojson">GeoJSON remote URL</option>
              <option value="arcgis-query-url">ArcGIS Query URL</option>
            </select>
          </div>
          {draft.sourceType === 'local-geojson' ? (
            <div className="form-group">
              <label className="form-label">Đường dẫn file (Upload)</label>
              <input
                className="input text-[13px] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-surface-alt)] file:text-[var(--color-navy)] hover:file:bg-[var(--color-border)] cursor-pointer"
                type="file"
                accept=".geojson,application/geo+json"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const ref = await uploadGeojsonFile(file)
                    setDraft((d) => ({ ...d, geojsonFile: `frontend-gis.upload.geojson.${ref.id}` }))
                  } catch (err) {
                    console.error('Lỗi upload file:', err)
                    alert('Lỗi upload file GeoJSON')
                  }
                }}
              />
              {draft.geojsonFile && draft.geojsonFile.startsWith('frontend-gis.upload.geojson') && (
                <p className="mt-1 text-xs text-[var(--color-success)]">Đã tải lên tệp mới thành công</p>
              )}
              {draft.geojsonFile && !draft.geojsonFile.startsWith('frontend-gis.upload.geojson') && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">File hiện tại: {draft.geojsonFile}</p>
              )}
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">URL</label>
              <input
                className="input"
                value={draft.geojsonUrl}
                onChange={(e) => setDraft((d) => ({ ...d, geojsonUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Loại hình học</label>
            <select
              className="input"
              value={draft.geometryType}
              onChange={(e) => setDraft((d) => ({ ...d, geometryType: e.target.value }))}
            >
              <option value="Point">Point</option>
              <option value="LineString">LineString</option>
              <option value="Polygon">Polygon</option>
              <option value="Mixed">Hỗn hợp</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
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
                <label className="form-label">Profile đường</label>
                <select
                  className="input h-9"
                  value={draft.lineProfile}
                  onChange={(e) => setDraft((d) => ({ ...d, lineProfile: e.target.value as 'circle' | 'quad' }))}
                >
                  <option value="circle">Ống tròn</option>
                  <option value="quad">Khối vuông</option>
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
                    setDraft((d) => ({ ...d, modelUrl: ref.objectUrl }))
                  } catch (err) {
                    console.error('Lỗi upload mô hình:', err)
                    alert('Lỗi upload mô hình 3D')
                  }
                }}
              />
              {draft.modelUrl && (
                <p className="mt-1 text-xs text-[var(--color-success)] truncate">Mô hình: {draft.modelUrl}</p>
              )}
            </div>
          )}
          <button className="btn-primary mt-3 w-full justify-center" type="button" onClick={submitForm}>
            <Save size={14} />
            {editingLayerId ? 'Cập nhật' : 'Thêm mới'}
          </button>
        </div>
      ) : null}

      {/* Layer List */}
      <div className="space-y-2">
        {layers.map((layer) => {
          const status = statusByLayerId[layer.layerId] ?? { loaded: 0, loading: false, progress: 0 }
          const isExpanded = expandedLayerId === layer.layerId
          const features = featuresByLayerId.get(layer.layerId) ?? []

          return (
            <article key={layer.layerId} className="list-row">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="color-swatch" style={{ backgroundColor: layer.style.pinColor }} />
                  <h3 className="truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                    {layer.layerName}
                  </h3>
                  <span className="badge-geometry">{layer.geometryType ?? 'Mixed'}</span>
                </div>
                <button className="icon-button" type="button" onClick={() => onToggleLayer(layer)} title={layer.visible ? 'Ẩn' : 'Hiển thị'}>
                  {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              {/* Status */}
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Database size={12} />
                  {status.loaded} features
                </span>
                <div className="flex items-center gap-1">
                  {status.loading ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-info)]">
                      <Loader2 size={12} className="animate-spin" />
                      {status.progress}%
                    </span>
                  ) : null}
                  <span className={layer.visible ? 'status-dot-on' : 'status-dot-off'} />
                </div>
              </div>

              {status.loading ? (
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${status.progress}%` }} />
                </div>
              ) : null}

              {status.error ? <p className="error-line mt-2">{status.error}</p> : null}

              {/* Action buttons */}
              <div className="mt-2 flex items-center gap-1">
                <button className="icon-button" type="button" onClick={() => setExpandedLayerId(isExpanded ? null : layer.layerId)} title="Thành phần con">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <button className="icon-button" type="button" onClick={() => openEditForm(layer)} title="Sửa">
                  <Pencil size={14} />
                </button>
                <button className="icon-button" type="button" onClick={() => onReloadLayer(layer)} title="Tải lại">
                  <RefreshCw size={14} />
                </button>
                <button className="icon-button" type="button" onClick={() => onZoomLayer(layer.layerId)} title="Phóng tới">
                  <LocateFixed size={14} />
                </button>
                <button className="icon-button" type="button" onClick={() => onDeleteLayer(layer.layerId)} title="Xóa" style={{ color: 'var(--color-error)' }}>
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Feature children */}
              {isExpanded ? (
                <div className="feature-children">
                  {features.length === 0 ? (
                    <p className="empty-line text-[11px]">Chưa tải features.</p>
                  ) : (
                    features.slice(0, 50).map((feature) => (
                      <div key={feature.id} className="feature-child-row">
                        <span className="feature-child-name">{feature.name}</span>
                        <div className="feature-child-actions">
                          <button className="icon-button" type="button" onClick={() => onZoomFeature(feature.id)} title="Phóng tới" style={{ height: 24, minWidth: 24, padding: 0 }}>
                            <LocateFixed size={12} />
                          </button>
                          <button className="icon-button" type="button" onClick={() => onSelectFeature(feature.id)} title="Xem" style={{ height: 24, minWidth: 24, padding: 0 }}>
                            <Eye size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  {features.length > 50 ? (
                    <p className="empty-line text-[11px] mt-1">...và {features.length - 50} features khác</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
