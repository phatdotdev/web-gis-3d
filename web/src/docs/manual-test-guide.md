# Hướng dẫn kiểm thử thủ công

## Cách chạy

```bash
cd web
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

## Danh sách kiểm thử

### 1. Bản đồ full màn hình
- [x] Mở app, map ArcGIS 3D chiếm toàn bộ viewport
- [x] Không có scroll bar, không có khoảng trắng

### 2. Panel trái floating
- [x] Panel trái hiển thị, map **không bị co**
- [x] Đóng panel trái bằng nút trên top bar
- [x] Mở lại bằng nút icon nhỏ

### 3. Tab Quản lý lớp dữ liệu
- [ ] Chuyển tab "Lớp dữ liệu" — hiển thị danh sách layer
- [ ] Bấm "Thêm lớp dữ liệu" — form hiện ra
- [ ] Điền thông tin, bấm "Thêm mới" — layer mới xuất hiện

### 4. Layer Point
- [ ] Bật layer "Cây xanh mẫu" → point hiện pin 3D đẹp (có callout line)
- [ ] Click point → panel phải mở với thông tin chi tiết
- [ ] Tắt layer → graphics biến mất nhưng **map không reload**

### 5. Layer LineString
- [ ] Bật layer "Cống/đường mẫu" → line hiển thị dạng 3D tube
- [ ] Có pin đại diện tại centroid
- [ ] Click line hoặc pin → mở inspector

### 6. Layer Polygon
- [ ] Bật layer "Địa phận mẫu" → polygon hiển thị fill/outline
- [ ] Có pin đại diện tại centroid
- [ ] Click polygon → mở inspector

### 7. Sửa layer
- [ ] Bấm icon bút chì → form sửa hiện ra
- [ ] Đổi tên/màu → bấm "Cập nhật"
- [ ] Layer trên map thay đổi

### 8. Xóa layer
- [ ] Bấm icon thùng rác → layer biến mất
- [ ] Graphics trên map bị xóa, các layer khác không ảnh hưởng

### 9. Feature children
- [ ] Bấm icon mũi tên → danh sách features hiện ra
- [ ] Bấm "Phóng tới" → map zoom tới feature
- [ ] Bấm "Xem" → inspector mở

### 10. Tab Quản lý thực thể
- [ ] Chuyển tab "Thực thể"
- [ ] Bấm "Thêm thực thể" → form hiện ra

### 11. Thêm entity Point
- [ ] Tạo entity Point x/y/z → pin hiện trên map
- [ ] Entity hiện trong danh sách

### 12. Gán model GLB
- [ ] Bấm icon upload → chọn file .glb
- [ ] Model hiện trên map (nếu file hợp lệ)

### 13. Xóa entity
- [ ] Bấm icon thùng rác → entity biến mất
- [ ] Chỉ graphics entity đó bị xóa, các entity khác không ảnh hưởng

### 14. Panel phải (Inspector)
- [ ] Chỉ hiện khi chọn feature/entity
- [ ] Hiển thị: tên, nguồn, tọa độ, kiểu hiển thị, model 3D, thuộc tính
- [ ] Bấm "Phóng tới" → map zoom
- [ ] Bấm "Bỏ chọn" → panel đóng

### 15. Persistence
- [ ] Thêm/sửa layer → reload trang → dữ liệu vẫn còn
- [ ] Thêm entity → reload trang → dữ liệu vẫn còn

### 16. Export JSON
- [ ] Bấm "Xuất JSON" trên top bar → file .json được download
- [ ] File chứa layers và entities

### 17. Đổi profile đường 3D
- [ ] Sửa layer LineString → đổi profile "Ống tròn" ↔ "Khối vuông"
- [ ] Line trên map thay đổi hình dạng

### 18. UI tiếng Việt
- [ ] Toàn bộ nhãn, nút, placeholder có dấu
- [ ] Không còn text tiếng Việt không dấu

## Lưu ý

- Object URL (model GLB upload) mất khi reload trang — đây là giới hạn của frontend-only
- Remote ArcGIS query URL có thể lỗi CORS tùy server
- Nếu cần reset dữ liệu: xóa localStorage keys `frontend-gis.*`
