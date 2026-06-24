import { Crosshair, Eraser, Home, Pencil, RefreshCw, Scissors } from 'lucide-react'

type MapToolbarProps = {
  onResetView: () => void
  onClearSelection: () => void
  onReloadVisible: () => void
  onToggleEditor3D: () => void
  onToggleSlice: () => void
  loadedFeatureCount: number
  editor3DEnabled: boolean
  sliceEnabled: boolean
}

export function MapToolbar({
  onResetView,
  onClearSelection,
  onReloadVisible,
  onToggleEditor3D,
  onToggleSlice,
  loadedFeatureCount,
  editor3DEnabled,
  sliceEnabled,
}: MapToolbarProps) {
  return (
    <div className="map-toolbar">
      <button className="icon-button" type="button" onClick={onResetView} title="Về vị trí mặc định">
        <Home size={16} />
      </button>
      <button className="icon-button" type="button" onClick={onClearSelection} title="Bỏ chọn">
        <Eraser size={16} />
      </button>
      <button className="icon-button" type="button" onClick={onReloadVisible} title="Tải lại các lớp hiển thị">
        <RefreshCw size={16} />
      </button>
      <button
        className={`icon-button ${editor3DEnabled ? 'active' : ''}`}
        type="button"
        onClick={onToggleEditor3D}
        title="Bật/tắt Editor 3D"
      >
        <Pencil size={16} />
      </button>
      <button
        className={`icon-button ${sliceEnabled ? 'active' : ''}`}
        type="button"
        onClick={onToggleSlice}
        title="Bật/tắt Slice"
      >
        <Scissors size={16} />
      </button>
      <div className="map-toolbar-divider" />
      <div className="map-toolbar-info">
        <Crosshair size={14} />
        <span>{loadedFeatureCount} features</span>
      </div>
    </div>
  )
}
