# Kiến trúc Frontend-Only GIS 3D

## Tổng quan

Hệ thống bản đồ GIS 3D chạy hoàn toàn trên frontend (browser), không cần backend server.
Dữ liệu được lưu trong **localStorage**, files upload dùng **Object URL**.

## Kiến trúc module

```
src/
├── app/App.tsx              ← Orchestrator chính, không chứa logic render
├── features/
│   ├── layer-management/    ← Quản lý lớp dữ liệu (CRUD, UI)
│   ├── map/                 ← ArcGIS SceneView, Inspector, Toolbar
│   └── spatial-entity-management/ ← Quản lý thực thể độc lập
├── services/
│   ├── geojson/             ← Loader, Normalizer, Repository (cache)
│   └── mock-backend/        ← localStorage repositories, file storage
├── types/                   ← TypeScript types (map, layer, entity, geojson, model3d)
├── utils/
│   ├── map-renderer/        ← Render Point/Line/Polygon, Symbol factory, Hit test
│   ├── file/                ← Download JSON, Object URL, Read file
│   └── performance/         ← Chunked render, debounce, throttle
└── constants/               ← Default symbols, folder paths
```

## Cách dữ liệu layer/entity được lưu

1. **Lần đầu**: Seed từ `/public/data/layers/layers.json` và `/public/data/entities/spatial-entities.json`
2. **Sau đó**: Lưu vào `localStorage` với key:
   - `frontend-gis.layers` — danh sách LayerConfig
   - `frontend-gis.entities` — danh sách SpatialEntityConfig
3. **GeoJSON cache**: Lưu trong memory (Map) theo layerId, không reload nếu đã có
4. **Upload GeoJSON**: Parse JSON → lưu vào localStorage key `frontend-gis.upload.geojson.{id}`
5. **Upload GLB model**: Dùng `URL.createObjectURL()` — tạm thời trong session

## Cách upload frontend-only hoạt động

Frontend **không thể ghi file** vào thư mục project. Thay vào đó:
- **GeoJSON upload**: Parse file → lưu JSON vào localStorage
- **GLB model upload**: Tạo Object URL (`blob:...`) → ArcGIS SDK render trực tiếp từ blob URL
- Object URL mất khi reload trang — cần IndexedDB nếu muốn persist (chưa implement)
- Để thay bằng backend thật: implement `FileStorageService` interface gọi REST API upload

## Cách thay mock repository bằng backend thật

Các repository đều có **interface** rõ ràng:

```typescript
interface LayerRepository {
  listLayers(): Promise<LayerConfig[]>
  getLayer(layerId: string): Promise<LayerConfig | null>
  saveLayer(layer: LayerConfig): Promise<void>
  deleteLayer(layerId: string): Promise<void>
}

interface SpatialEntityRepository {
  listEntities(): Promise<SpatialEntityConfig[]>
  saveEntity(entity: SpatialEntityConfig): Promise<void>
  deleteEntity(entityId: string): Promise<void>
}
```

Tạo class mới implement interface, gọi REST API, rồi đổi export:
```typescript
export const layerRepository = new ApiLayerRepository('https://your-api.com')
```

## Cách render Point / Line / Polygon

### Point
- **Symbol**: `PointSymbol3D` + `IconSymbol3DLayer` — pin nổi với callout line
- **Z**: Mặc định 0, lấy từ GeoJSON `coordinates[2]`
- **Model GLB**: Nếu `model3D.enabled` → thêm graphic với `ObjectSymbol3DLayer`
- **Fallback**: Nếu model lỗi, chỉ hiện pin

### LineString
- **Symbol**: `LineSymbol3D` + `PathSymbol3DLayer` — render 3D trong SceneView
- **Profile**: `"circle"` = ống tròn, `"quad"` = khối vuông
- **Width/Height**: Tùy chỉnh qua `lineWidth`, `lineHeight`
- **Pin centroid**: Tại midpoint/trung bình tọa độ, click mở inspector

### Polygon
- **Symbol**: `SimpleFillSymbol` — fill/outline/opacity như map 2D
- **Pin centroid**: Tại trung bình ring đầu tiên

## Vì sao Line dùng 3D symbol

ArcGIS SceneView yêu cầu 3D symbol để hiển thị đúng trong không gian 3D.
`PathSymbol3DLayer` cho phép render đường dạng ống/khối với width/height tùy chỉnh,
tạo hiệu ứng trực quan tốt hơn `SimpleLineSymbol` trong 3D.

## Cách tránh reload map

### Nguyên tắc
- **SceneView chỉ tạo 1 lần** — `initializedRef` ngăn recreate
- **Toggle layer**: `removeFeaturesBySource()` xóa graphics theo index, không `removeAll()`
- **Delete layer/entity**: Chỉ xóa graphics của source đó
- **Selection**: Chỉ update highlight layer + inspector state

### Feature Index
```typescript
graphicIndex: Map<string, Graphic[]>        // featureId → graphics
layerFeatureIndex: Map<string, Set<string>> // layerId → Set<featureId>
entityFeatureIndex: Map<string, Set<string>> // entityId → Set<featureId>
```

Khi xóa layer: lấy featureIds từ `layerFeatureIndex` → xóa từng feature từ `graphicIndex` → remove graphics.

## GeoJSON sources

Hỗ trợ:
- **Local file**: `/data/geojson/*.geojson`
- **Uploaded file**: Parse + lưu localStorage
- **Remote URL**: Fetch trực tiếp
- **ArcGIS query URL**: Tự thêm `where=1=1&outFields=*&f=geojson&returnGeometry=true`
