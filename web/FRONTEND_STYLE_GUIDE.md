# FRONTEND STYLE GUIDE — Esri-Inspired UI

### Dành cho Codex 5.5 · Phiên bản 1.0

> Mục tiêu: Giao diện chuyên nghiệp, đồng nhất theo phong cách **Esri / my.esri.com** —  
> màu xanh navy & teal chủ đạo, flat design, không gradient, border-radius tối thiểu.

---

## 1. TRIẾT LÝ THIẾT KẾ

| Nguyên tắc               | Mô tả                                               |
| ------------------------ | --------------------------------------------------- |
| **Flat over Glossy**     | Không dùng gradient, không shadow nặng, không bevel |
| **Clarity First**        | Thông tin rõ ràng, không decor thừa                 |
| **Data-Forward**         | Ưu tiên hiển thị dữ liệu — maps, tables, stats      |
| **Professional Neutral** | Không playful, không quirky — tone enterprise       |
| **Consistent Grid**      | Canh chỉnh nghiêm chỉnh, spacing có hệ thống        |

---

## 2. BỘ MÀU SẮC (Color Tokens)

### Primary Palette

```css
/* ===== ESRI CORE COLORS ===== */

/* Xanh Navy — màu nền header, sidebar, CTA primary */
--color-navy: #003865; /* Esri Dark Blue */
--color-navy-mid: #004c97; /* Esri Blue — button primary */
--color-navy-light: #0079c1; /* Esri Light Blue — link, hover */

/* Teal — màu accent, icon, badge */
--color-teal: #00897b; /* Esri Teal */
--color-teal-light: #26a69a; /* Teal hover */

/* Nền & Surface */
--color-bg: #f5f5f5; /* Background trang chính */
--color-surface: #ffffff; /* Card, panel, modal */
--color-surface-alt: #eeeeee; /* Row striping, hover state */

/* Đường kẻ & Divider */
--color-border: #d6d6d6;
--color-border-dark: #b0bec5;

/* Chữ */
--color-text-primary: #1a1a1a;
--color-text-secondary: #555555;
--color-text-muted: #888888;
--color-text-inverse: #ffffff; /* Chữ trên nền tối */

/* Trạng thái */
--color-success: #2e7d32;
--color-warning: #f57c00;
--color-error: #c62828;
--color-info: #0079c1; /* Dùng Navy Light */
```

### ⚠️ Quy tắc màu bắt buộc

```
✅ ĐƯỢC PHÉP:
  - Màu solid (flat) cho button, badge, icon
  - Hover state: làm tối/sáng hơn 10–15%
  - Transparent overlay: rgba(0,56,101,0.08) cho hover row

❌ KHÔNG ĐƯỢC:
  - background: linear-gradient(...)   → BANNED
  - background: radial-gradient(...)   → BANNED
  - Màu sáng neon, pastel quá nhạt     → BANNED
  - Nhiều hơn 3 màu cùng lúc trong 1 component → TRÁNH
```

---

## 3. TYPOGRAPHY

### Font Stack

```css
/* Font chính — Sans-serif chuyên nghiệp */
--font-primary: "Avenir Next", "Avenir", "Segoe UI", Arial, sans-serif;

/* Font code / mono */
--font-mono: "Fira Code", "Consolas", "Courier New", monospace;
```

> **Lưu ý:** Avenir Next là font của Esri. Nếu không có license, dùng  
> `"Segoe UI"` (Windows) hoặc load từ Google Fonts: **`Nunito Sans`** hoặc **`Inter`**

### Type Scale

```css
--text-xs: 11px; /* label, caption, badge text */
--text-sm: 13px; /* secondary text, table cell */
--text-base: 15px; /* body text chính */
--text-md: 17px; /* subheading */
--text-lg: 20px; /* section title */
--text-xl: 24px; /* page heading */
--text-2xl: 32px; /* hero heading */

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--line-height-tight: 1.25;
--line-height-normal: 1.5;
--line-height-loose: 1.75;

--letter-spacing-tight: -0.01em;
--letter-spacing-wide: 0.04em; /* dùng cho UPPERCASE label */
```

### Quy tắc Typography

```
- Heading:  font-weight: 600–700, letter-spacing: -0.01em
- Body:     font-weight: 400, line-height: 1.5
- Label:    UPPERCASE, font-size: 11px, letter-spacing: 0.06em, color: --color-text-muted
- Link:     color: --color-navy-light, underline chỉ khi hover
```

---

## 4. SPACING SYSTEM

```css
/* Base unit = 4px */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
```

**Quy tắc spacing:**

- Padding card/panel: `--space-6` (24px)
- Padding button: `--space-2` `--space-4` (8px 16px)
- Gap giữa các section: `--space-8` đến `--space-12`
- Margin giữa label và input: `--space-2` (8px)

---

## 5. BORDER RADIUS

> **Esri style: Tối thiểu hoặc bằng 0**

```css
--radius-none: 0px; /* Default — button, input, panel, table */
--radius-sm: 2px; /* Chỉ dùng cho badge, tag nhỏ */
--radius-md: 4px; /* Tối đa cho dropdown, tooltip */
--radius-full: 9999px; /* CHỈ dùng cho avatar, status dot */
```

```
✅ Dùng --radius-none (0px) cho:
   Button, Input, Card, Panel, Modal, Table, Header, Sidebar, Toolbar

✅ Dùng --radius-sm (2px) cho:
   Badge, Tag, Alert banner nhỏ

❌ KHÔNG dùng border-radius: 8px, 12px, 16px, 24px
   → Trông quá "consumer app", mất phong cách enterprise
```

---

## 6. SHADOW & ELEVATION

```css
/* Esri dùng border thay vì shadow nặng */
--shadow-none: none;
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12); /* Card tách nền */
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15); /* Dropdown, Popover */
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.18); /* Modal */

/* ❌ KHÔNG dùng colored shadow hoặc shadow glow */
```

---

## 7. COMPONENT SPECS

### 7.1 Button

```css
.btn {
  font-family: var(--font-primary);
  font-size: var(--text-sm); /* 13px */
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.02em;
  padding: var(--space-2) var(--space-4); /* 8px 16px */
  border-radius: var(--radius-none); /* 0px */
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

/* Primary */
.btn-primary {
  background: var(--color-navy-mid); /* #004C97 */
  color: var(--color-text-inverse);
  border-color: var(--color-navy-mid);
}
.btn-primary:hover {
  background: var(--color-navy); /* #003865 */
  border-color: var(--color-navy);
}

/* Secondary / Ghost */
.btn-secondary {
  background: transparent;
  color: var(--color-navy-mid);
  border-color: var(--color-navy-mid);
}
.btn-secondary:hover {
  background: rgba(0, 76, 151, 0.08);
}

/* Danger */
.btn-danger {
  background: var(--color-error);
  color: white;
  border-color: var(--color-error);
}
```

### 7.2 Input / Form Field

```css
.input {
  font-family: var(--font-primary);
  font-size: var(--text-base); /* 15px */
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none); /* 0px */
  padding: var(--space-2) var(--space-3); /* 8px 12px */
  width: 100%;
  transition: border-color 0.15s ease;
}
.input:focus {
  outline: none;
  border-color: var(--color-navy-light); /* #0079C1 */
  box-shadow: 0 0 0 2px rgba(0, 121, 193, 0.2);
}
.input:disabled {
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}

label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
  display: block;
}
```

### 7.3 Card / Panel

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-none); /* 0px */
  padding: var(--space-6); /* 24px */
  /* Không dùng box-shadow nặng */
}

.card-header {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
}
```

### 7.4 Table

```css
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.table th {
  background: var(--color-navy);
  color: var(--color-text-inverse);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
}
.table td {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}
.table tr:hover td {
  background: rgba(0, 56, 101, 0.04);
}
.table tr:nth-child(even) td {
  background: var(--color-surface-alt);
}
```

### 7.5 Header / Topbar

```css
.header {
  background: var(--color-navy); /* #003865 */
  color: var(--color-text-inverse);
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 var(--space-6);
  border-bottom: 2px solid var(--color-teal); /* Accent line */
}

.header-logo {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

.header-nav a {
  color: rgba(255, 255, 255, 0.85);
  font-size: var(--text-sm);
  padding: 0 var(--space-4);
  text-decoration: none;
  transition: color 0.15s;
}
.header-nav a:hover {
  color: var(--color-text-inverse);
}
.header-nav a.active {
  color: var(--color-text-inverse);
  border-bottom: 2px solid var(--color-teal);
}
```

### 7.6 Sidebar

```css
.sidebar {
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  width: 240px;
  padding: var(--space-4) 0;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.1s ease;
}
.sidebar-item:hover {
  background: var(--color-surface-alt);
  color: var(--color-text-primary);
}
.sidebar-item.active {
  color: var(--color-navy-mid);
  font-weight: var(--font-weight-semibold);
  border-left-color: var(--color-navy-mid);
  background: rgba(0, 76, 151, 0.06);
}
```

### 7.7 Badge / Tag

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.03em;
  border-radius: var(--radius-sm); /* 2px */
}
.badge-blue {
  background: #e3f0fa;
  color: var(--color-navy-mid);
}
.badge-teal {
  background: #e0f2f1;
  color: var(--color-teal);
}
.badge-success {
  background: #e8f5e9;
  color: var(--color-success);
}
.badge-warning {
  background: #fff3e0;
  color: var(--color-warning);
}
.badge-error {
  background: #ffebee;
  color: var(--color-error);
}
```

---

## 8. ICON GUIDELINES

```
- Dùng icon set: Esri Calcite Icons, hoặc thay thế bằng Phosphor Icons / Lucide
- Size chuẩn: 16px (inline), 20px (button), 24px (sidebar)
- Màu icon: kế thừa color của parent (currentColor)
- KHÔNG dùng icon màu sặc sỡ riêng biệt trong interface data
```

---

## 9. LAYOUT GRID

```css
/* Container */
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

/* Layout chính: Sidebar + Content */
.layout-main {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 56px 1fr;
  min-height: 100vh;
}

/* Grid nội dung */
.grid-cols-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-6);
}
.grid-cols-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
}
.grid-cols-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-6);
}
```

---

## 10. ANIMATION & TRANSITION

```css
/* Chỉ dùng transition nhẹ, không animation phức tạp */
--transition-fast: 0.1s ease;
--transition-normal: 0.15s ease;
--transition-slow: 0.25s ease;

/* Áp dụng cho: hover, focus, active state */
/* KHÔNG dùng: bounce, elastic, shake, spin (trừ loading spinner) */
```

---

## 11. CHECKLIST TRƯỚC KHI COMMIT

```
□ Không có linear-gradient hoặc radial-gradient nào trong code
□ Border-radius không vượt quá 4px (trừ avatar/dot)
□ Màu chỉ dùng từ bảng token đã định nghĩa
□ Header dùng --color-navy (#003865)
□ Button primary dùng --color-navy-mid (#004C97)
□ Accent / highlight dùng --color-teal (#00897B)
□ Font chữ đồng nhất với --font-primary
□ Label uppercase với letter-spacing
□ Hover state có transition
□ Không có box-shadow màu (chỉ rgba đen)
```

---

## 12. QUICK REFERENCE — CSS VARIABLES ĐẦY ĐỦ

Dán vào `:root {}` của file CSS chính:

```css
:root {
  /* Colors */
  --color-navy: #003865;
  --color-navy-mid: #004c97;
  --color-navy-light: #0079c1;
  --color-teal: #00897b;
  --color-teal-light: #26a69a;
  --color-bg: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-alt: #eeeeee;
  --color-border: #d6d6d6;
  --color-border-dark: #b0bec5;
  --color-text-primary: #1a1a1a;
  --color-text-secondary: #555555;
  --color-text-muted: #888888;
  --color-text-inverse: #ffffff;
  --color-success: #2e7d32;
  --color-warning: #f57c00;
  --color-error: #c62828;
  --color-info: #0079c1;

  /* Typography */
  --font-primary: "Avenir Next", "Segoe UI", "Nunito Sans", Arial, sans-serif;
  --font-mono: "Fira Code", "Consolas", monospace;
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-md: 17px;
  --text-lg: 20px;
  --text-xl: 24px;
  --text-2xl: 32px;
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-loose: 1.75;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Border Radius */
  --radius-none: 0px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-full: 9999px;

  /* Shadow */
  --shadow-none: none;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.18);

  /* Transition */
  --transition-fast: 0.1s ease;
  --transition-normal: 0.15s ease;
  --transition-slow: 0.25s ease;
}
```

---

_Tài liệu này dùng làm style reference duy nhất cho toàn bộ codebase.  
Mọi component mới phải tuân theo các token và quy tắc được định nghĩa ở đây._
