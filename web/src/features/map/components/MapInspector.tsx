import { EyeOff, LocateFixed, X } from 'lucide-react'
import type { InspectorFeature } from '../../../types/map'

type MapInspectorProps = {
  feature: InspectorFeature | null
  onClose: () => void
  onZoom: (featureId: string) => void
  onToggleModel: (featureId: string) => void
}

/**
 * Panel phải — floating, chỉ hiển thị khi selected feature/entity.
 */
export function MapInspector({ feature, onClose, onZoom, onToggleModel }: MapInspectorProps) {
  if (!feature) {
    return null
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--color-border)]">
        <div className="min-w-0">
          <p className="label">Thông tin chi tiết</p>
          <h2 className="mt-1 text-[16px] font-semibold text-[var(--color-text-primary)] break-words">{feature.name}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} title="Bỏ chọn">
          <X size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <button className="btn-primary" type="button" onClick={() => onZoom(feature.id)}>
          <LocateFixed size={14} />
          Phóng tới
        </button>
        <button className="btn-secondary" type="button" onClick={() => onToggleModel(feature.id)}>
          <EyeOff size={14} />
          Model 3D
        </button>
        <button className="btn-secondary" type="button" onClick={onClose}>
          Bỏ chọn
        </button>
      </div>

      {/* Details */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        <dl className="inspector-grid">
          <InfoField label="Nguồn" value={feature.sourceType === 'layer' ? 'Lớp dữ liệu' : 'Thực thể'} />
          <InfoField label="Loại hình học" value={feature.geometryType} />
          <InfoField label="Tên lớp" value={feature.layerName ?? '—'} />
          <InfoField label="Mã định danh" value={feature.id} />
        </dl>

        {/* Centroid */}
        {feature.centroid ? (
          <div className="inspector-section">
            <h3 className="label mb-2">Tọa độ centroid</h3>
            <dl className="inspector-grid">
              <InfoField label="Kinh độ" value={feature.centroid.longitude.toFixed(6)} />
              <InfoField label="Vĩ độ" value={feature.centroid.latitude.toFixed(6)} />
              {feature.centroid.z != null ? <InfoField label="Cao độ (Z)" value={String(feature.centroid.z)} /> : null}
            </dl>
          </div>
        ) : null}

        {/* Style */}
        <div className="inspector-section">
          <h3 className="label mb-2">Kiểu hiển thị</h3>
          <dl className="inspector-grid">
            <InfoField label="Màu pin" value={feature.style.pinColor} />
            <InfoField label="Màu đường" value={feature.style.lineColor} />
            <InfoField label="Độ rộng" value={`${feature.style.lineWidth}px`} />
            <InfoField label="Profile" value={feature.style.lineProfile} />
          </dl>
        </div>

        {/* Model 3D */}
        {feature.model3D ? (
          <div className="inspector-section">
            <h3 className="label mb-2">Model 3D</h3>
            <dl className="inspector-grid">
              <InfoField label="Bật" value={feature.model3D.enabled ? 'Có' : 'Không'} />
              {feature.model3D.modelUrl ? <InfoField label="URL" value={feature.model3D.modelUrl} /> : null}
            </dl>
          </div>
        ) : null}

        {/* Properties */}
        <DataBlock title="Thuộc tính" value={feature.properties} />
        <DataBlock title="Metadata" value={feature.metadata ?? {}} />
      </div>
    </>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="inspector-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function DataBlock({ title, value }: { title: string; value: Record<string, unknown> }) {
  const entries = Object.keys(value)
  if (entries.length === 0) {
    return null
  }

  return (
    <div className="inspector-data-block">
      <h3 className="label mb-2">{title}</h3>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}
