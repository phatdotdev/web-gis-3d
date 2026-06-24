import { Crosshair, Eraser, Home, RefreshCw } from 'lucide-react'

type MapToolbarProps = {
  onResetView: () => void
  onClearSelection: () => void
  onReloadVisible: () => void
  loadedFeatureCount: number
}

export function MapToolbar({
  onResetView,
  onClearSelection,
  onReloadVisible,
  loadedFeatureCount,
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
      <div className="map-toolbar-divider" />
      <div className="map-toolbar-info">
        <Crosshair size={14} />
        <span>{loadedFeatureCount} features</span>
      </div>
    </div>
  )
}
