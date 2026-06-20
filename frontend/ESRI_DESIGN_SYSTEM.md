# Hướng dẫn Thiết kế Giao diện Esri Calcite Design System

Tài liệu này định nghĩa ngôn ngữ thiết kế giao diện và quy chuẩn phát triển UI cho dự án, tuân theo hệ thống **Esri Calcite Design System**. Tất cả các cập nhật giao diện trong tương lai cần tuân thủ nghiêm ngặt các quy tắc này.

---

## 1. Định Hướng Phong Cách (Design Principles)
- **Tối giản & Kỹ thuật**: Giao diện gọn gàng, tinh gọn, mang tính kỹ thuật cao (phù hợp với phong cách Enterprise/GIS).
- **Mật độ thông tin cao**: Tối ưu hóa không gian hiển thị cho dữ liệu bản đồ và biểu đồ, tránh khoảng trắng thừa thừa thãi.
- **Phẳng & Sắc nét**: Loại bỏ hoàn toàn hiệu ứng gradient sặc sỡ, glassmorphism, và bóng đổ (box-shadow) quá đậm. Thay thế bằng các đường viền phân tách mỏng nhẹ.

---

## 2. Hệ Thống Token Thiết Kế (Design Tokens)

### Bảng Mã Màu (Colors)
| Token | Light Mode (Nền Sáng) | Dark Mode (Nền Tối) | Mô Tả |
| :--- | :--- | :--- | :--- |
| `bg-surface-1` | `#F7F7F7` | `#212121` | Nền nền bản đồ/phụ |
| `bg-surface-2` | `#FFFFFF` | `#2B2B2B` | Nền chính của panel, card, modal |
| `bg-surface-3` | `#F2F2F2` | `#363636` | Nền cho các dòng grid, hover item |
| `text-1` | `#141414` | `#FFFFFF` | Chữ chính (tiêu đề, nhãn quan trọng) |
| `text-2` | `#4A4A4A` | `#BFBFBF` | Chữ phụ, mô tả ngắn |
| `text-3` | `#6B6B6B` | `#9E9E9E` | Chữ gợi ý, placeholder |
| `border-1` | `#D4D4D4` | `#545454` | Đường viền phân cách panel/card |
| `border-2` | `#DEDEDE` | `#4A4A4A` | Đường viền mỏng nội bộ bên trong |
| `brand` | `#007AC2` | `#009AF2` | Xanh lam thương hiệu Esri (chủ đạo) |
| `brand-hover` | `#00619B` | `#40B9FF` | Màu xanh khi hover các nút thương hiệu |

### Bo Góc (Border Radius)
- `sharp`: `0px` (Dùng cho sidebar/panel tràn sát cạnh viền màn hình).
- `xs`: `2px` (Dùng cho các nhãn nhỏ, tag, tooltip).
- `sm`: `4px` (Mặc định cho hầu hết các thành phần: Card, Container, Button, Input, Modal).
- `pill`: `9999px` (Dùng cho avatar hoặc các nút dạng kẹo thuốc tròn).

### Đường Viền (Border Width)
- `default`: `1px` (Độ dày đường viền cơ bản).
- `focus`: `2px` (Độ dày khi focus vào input/form).

### Phông Chữ (Font Family)
- `Segoe UI, Roboto, Helvetica Neue, sans-serif` (Thiết lập mặc định trên toàn dự án).

---

## 3. Quy Tắc Áp Dụng Cho Cấu Phần Giao Diện (Style Rules)

### 3.1. Thẻ & Khung chứa (Card & Container)
- Sử dụng nền `bg-calcite-bg-2` (hoặc `bg-white`).
- Đường viền `border border-calcite-border-1` (1px).
- Bo góc `rounded-sm` (4px).
- Bóng đổ: Không sử dụng hoặc chỉ dùng bóng đổ siêu nhẹ (`shadow-[0_2px_12px_rgba(0,0,0,0.08)]`).

### 3.2. Nút bấm (Buttons & Call to Action)
- Nút bấm chính: Nền `bg-calcite-brand`, chữ màu trắng, bo góc `rounded-sm` (4px). Khi hover chuyển sang màu `bg-calcite-brand-hover`.
- Nút phụ: Nền trắng, viền `border-calcite-border-1`, màu chữ `text-calcite-text-2`, hover đổi nền sang `bg-calcite-bg-3`.
- Khoảng cách đệm lý tưởng: `py-1.5 px-3` (cho nút nhỏ) hoặc `py-2 px-4` (cho nút tiêu chuẩn).

### 3.3. Biểu mẫu & Ô nhập liệu (Forms & Inputs)
- Nền `bg-calcite-bg-2`, đường viền `border border-calcite-border-2`.
- Bo góc `rounded-sm` (4px).
- Khi focus: Hiển thị đường viền màu xanh `border-calcite-brand` với độ dày `focus` (2px). Giữ nguyên hành vi outline chuẩn hỗ trợ tiếp cận (accessibility).

### 3.4. Bảng điều khiển (Panels & Sidebars)
- Nếu cấu phần đó tràn sát viền màn hình (ví dụ: thanh Sidebar trái, Header trên cùng), sử dụng bo góc `rounded-none` (`sharp` - 0px) để tạo sự liền mạch của hệ thống GIS Dashboard chuyên nghiệp.
- Mật độ hiển thị thông tin tối đa, không để các thẻ đè khuất quá nhiều không gian bản đồ.
