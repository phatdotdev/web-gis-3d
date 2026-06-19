# Quy Chuẩn Tổ Chức Code Cho AI Agent

## Mục tiêu

AI Agent phải tổ chức code:

- dễ đọc
- dễ maintain
- dễ scale
- không nhồi mọi thứ vào 1 file
- không tạo thư mục hỗn loạn

---

# 1. Một file = một trách nhiệm

## ❌ Sai

```txt
MapPage.jsx
- render UI
- gọi API
- xử lý GIS
- websocket
- state
```

## ✅ Đúng

```txt
pages/
components/
services/
hooks/
utils/
```

---

# 2. Không để file quá lớn

| Loại      | Giới hạn khuyến nghị |
| --------- | -------------------- |
| Component | < 300 dòng           |
| Service   | < 300 dòng           |
| Utility   | < 200 dòng           |

Nếu quá lớn → tách module.

---

# 3. Tổ chức theo feature

## ✅ Đúng

```txt
features/
  map/
  auth/
  drainage/
```

Ví dụ:

```txt
features/
  map/
    components/
    hooks/
    services/
    utils/
```

---

# 4. Không viết business logic trong UI

## ❌ Sai

```jsx
<button onClick={async () => {
  const data = await fetch(...)
}}>
```

## ✅ Đúng

```jsx
<button onClick={handleLoad}>
```

```js
const handleLoad = async () => {
  await mapService.load();
};
```

---

# 5. Quy tắc đặt tên

## Component

```txt
MapView.jsx
LayerPanel.jsx
```

## Hook

```txt
useMap.js
useSocket.js
```

## Service

```txt
map.service.js
```

Không dùng:

```txt
test.js
abc.js
final.js
```

---

# 6. Tách rõ trách nhiệm

| Thành phần | Vai trò           |
| ---------- | ----------------- |
| component  | UI                |
| hook       | state + lifecycle |
| service    | API + business    |
| utils      | helper            |
| constants  | hằng số           |
| config     | cấu hình          |

---

# 7. Không hardcode

## ❌ Sai

```js
width: 382;
```

## ✅ Đúng

```js
export const SIDEBAR_WIDTH = 380;
```

---

# 8. Với GIS/3D

Tách riêng:

```txt
layers/
renderers/
terrain/
gltf/
workers/
```

Không để toàn bộ logic trong:

```txt
MapUtils.js
```

---

# 9. Checklist

- [ ] File có quá lớn không?
- [ ] Có nhồi logic vào UI không?
- [ ] Có duplicate code không?
- [ ] Tên file có rõ nghĩa không?
- [ ] Có dễ scale không?
- [ ] Có dễ đọc không?

---

# 10. Tư duy AI Agent

AI Agent phải code như senior engineer:

- ưu tiên readability
- ưu tiên maintainability
- ưu tiên scalability
- tránh spaghetti code
- tự động tách module hợp lý
