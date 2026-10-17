# OncoScreen AI — Frontend Design Skill

> **Mọi thay đổi giao diện frontend trong mọi tuần triển khai đều BẮT BUỘC đọc và tuân thủ file này.**
> Nguồn tham chiếu:
> - [anthropics/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)
> - [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

---

## 1. Bối cảnh sản phẩm (Subject-Matter Grounding)

**OncoScreen AI** là nền tảng hỗ trợ tầm soát ung thư có bác sĩ phê duyệt (Human-in-the-Loop), phục vụ hai đối tượng chính:

| Đối tượng | Tâm lý khi sử dụng | Mục tiêu thiết kế |
|---|---|---|
| **Bệnh nhân** | Lo lắng, cần được trấn an, có thể không rành công nghệ | Thân thiện, dẫn dắt rõ ràng, giọng điệu ấm áp, **không gây hoảng loạn** |
| **Bác sĩ** | Cần xem nhanh, quyết đoán, ra quyết định dưới áp lực thời gian | Mật độ thông tin cao, tương phản rõ ràng, thao tác tối giản |

Thiết kế PHẢI phản ánh ngành y tế — **tin cậy, chuyên môn, bình tĩnh, rõ ràng** — chứ không phải một ứng dụng SaaS chung chung hay một landing page bán hàng.

---

## 2. Nguyên tắc thiết kế cốt lõi

### 2.1 Chống "AI Template Tell" (Tránh dấu hiệu AI tạo ra)

Các dấu hiệu sau **PHẢI TRÁNH** vì chúng là đặc trưng của giao diện do AI sinh tự động:

| ❌ TRÁNH | ✅ THAY BẰNG |
|---|---|
| Nền kem ấm `#F4F1EA` + accent terracotta `#D97757` | Bảng màu y tế riêng (xem mục 3.1) |
| Nền gần đen + accent acid-green/vermilion đơn độc | Tông sáng, chuyên nghiệp, tĩnh lặng |
| Thẻ bài đồng nhất `rounded-xl shadow-sm` khắp nơi | Phân cấp card: hero card lớn vs info card nhỏ, border-radius khác nhau theo vai trò |
| Highlight một từ duy nhất trong tiêu đề bằng màu/đậm | Để cả tiêu đề một tone, dùng phân cấp cỡ chữ thay vì tô màu |
| Nhãn ALL CAPS cho mọi thẻ | Dùng chữ thường hoặc Title Case, ALL CAPS chỉ cho badge trạng thái thực sự cần nổi bật |
| Số đánh thứ tự 01/02/03 cho nội dung không phải quy trình | Chỉ đánh số khi nội dung thực sự là trình tự (Bước khảo sát, Timeline tầm soát) |
| Emoji hệ điều hành (`🏠`, `📋`, `✅`) trong navigation và nút bấm | SVG icon inline thuần túy, nét mảnh, đồng bộ |
| `fade-in` + `translateY` trên mọi section | Chỉ dùng animation cho phản hồi hành động (mở panel, xác nhận, chuyển bước); tải trang KHÔNG cần animation rải rác |
| `active:scale-95` trên mọi nút (hiệu ứng "nảy") | Chuyển trạng thái tinh tế: đổi background, đổi opacity, border-color; không scale |

### 2.2 Quy tắc Bảng màu 60-30-10

```
60%  Nền & bề mặt   → Tone trung tính sáng (white, slate-50, zinc-50)
30%  Thành phần phụ  → Xám trung (slate-200..400), viền, divider, text phụ
10%  Điểm nhấn       → Màu thương hiệu chính (Medical Teal / Navy) + trạng thái (Success, Warning, Danger)
```

Giữ đúng tỷ lệ này ở **mọi trang**. Khi thêm một khối màu mới, tự hỏi: "Nó thuộc 60, 30, hay 10?"

### 2.3 Quy tắc về Chuyển động (Motion)

- **User-triggered motion** (mở dropdown, chuyển tab, xác nhận form) → **Được phép**, thời lượng 150–200ms, easing `ease-out`.
- **Non-user-triggered motion** (fade-in khi tải trang, slide-up section) → **Hạn chế tối đa**. Chỉ cho phép tối đa MỘT hiệu ứng load duy nhất trên trang (ví dụ: skeleton → content). Không animation entrance cho từng card riêng lẻ.
- **Loading states** → Dùng Skeleton placeholder (hình chữ nhật xám nhạt nhấp nháy nhẹ), KHÔNG dùng spinner đơn độc giữa trang trống.

### 2.4 Quy tắc về Nội dung viết (Copy)

- **Giọng điệu**: Bình tĩnh, rõ ràng, **không dọa** (kể cả khi có Red-flag).
- **Ngôi xưng**: "Bạn" cho bệnh nhân, không dùng "quý khách" hay "anh/chị".
- **Disclaimer**: BẮT BUỘC hiển thị trên mọi màn kết quả, giọng điệu khách quan, chuyên môn.
- **Không dùng placeholder chung chung** ("Lorem ipsum", "Click here"). Mọi text phải mang ngữ cảnh y tế thực tế.

---

## 3. Design Tokens (Hệ thống Token Thiết kế)

### 3.1 Bảng màu (Color Palette)

```css
:root {
  /* ── Nền & bề mặt ── */
  --surface-primary:   #FFFFFF;
  --surface-secondary: #F8FAFC;       /* slate-50 */
  --surface-elevated:  #FFFFFF;

  /* ── Thương hiệu chính: Medical Teal ── */
  --brand-50:  #F0FDFA;
  --brand-100: #CCFBF1;
  --brand-500: #14B8A6;               /* teal-500 */
  --brand-600: #0D9488;               /* teal-600 — nút chính */
  --brand-700: #0F766E;               /* teal-700 — hover */
  --brand-800: #115E59;               /* teal-800 — text đậm */
  --brand-900: #134E4A;               /* teal-900 */

  /* ── Phụ trợ: Indigo (cho khu vực Bác sĩ) ── */
  --doctor-500: #6366F1;              /* indigo-500 */
  --doctor-600: #4F46E5;              /* indigo-600 */
  --doctor-50:  #EEF2FF;              /* indigo-50 */

  /* ── Trạng thái ngữ nghĩa ── */
  --success:   #059669;               /* emerald-600 */
  --warning:   #D97706;               /* amber-600 */
  --danger:    #DC2626;               /* red-600 */
  --danger-soft: #FEF2F2;             /* red-50 */
  --info:      #0284C7;               /* sky-600 */

  /* ── Văn bản ── */
  --text-primary:   #0F172A;          /* slate-900 */
  --text-secondary: #475569;          /* slate-600 */
  --text-tertiary:  #94A3B8;          /* slate-400 */
  --text-inverse:   #FFFFFF;

  /* ── Viền & Phân cách ── */
  --border-default: #E2E8F0;          /* slate-200 */
  --border-strong:  #CBD5E1;          /* slate-300 */
}
```

**Quy tắc ràng buộc:**
- Khu vực **Bệnh nhân**: Dùng `--brand-*` (teal) làm điểm nhấn chính.
- Khu vực **Bác sĩ**: Dùng `--doctor-*` (indigo) làm điểm nhấn chính.
- `--danger` chỉ dùng cho Red-flag thực sự, KHÔNG dùng cho validation lỗi form thông thường (dùng `--warning` hoặc border đỏ nhạt).
- Nền trang luôn là `--surface-secondary` (`#F8FAFC`), card nổi trên nền là `--surface-primary` (`#FFFFFF`).

### 3.2 Typography (Phông chữ)

```css
/* ── Font stack ── */
--font-sans: "Inter", system-ui, -apple-system, sans-serif;

/* ── Type scale ── */
--text-xs:   0.75rem;    /* 12px — metadata, badge, timestamp */
--text-sm:   0.875rem;   /* 14px — body phụ, label, caption */
--text-base: 1rem;       /* 16px — body chính */
--text-lg:   1.125rem;   /* 18px — heading nhỏ, lead paragraph */
--text-xl:   1.25rem;    /* 20px — page title */
--text-2xl:  1.5rem;     /* 24px — section hero (Login, Dashboard greeting) */

/* ── Line height ── */
--leading-tight:  1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* ── Font weight ── */
--weight-normal:   400;
--weight-medium:   500;     /* label, nav item */
--weight-semibold: 600;     /* heading, tên bệnh nhân */
--weight-bold:     700;     /* page title, hero stat */
```

**Quy tắc ràng buộc:**
- Dùng DUY NHẤT font Inter (đã cài sẵn). Nếu muốn thêm font thứ 2 cho heading (ví dụ DM Sans), hai font phải **khác biệt rõ ràng** về cá tính.
- Chiều dài dòng tối đa: `max-w-prose` (~65ch) cho body text. Không để text body chạy full-width trên màn rộng.
- **Không** dùng font-weight `300` (light) cho body — khó đọc trên màn hình chất lượng thấp.

### 3.3 Spacing & Layout

```
Spacing scale: 4px increments (Tailwind default)
  Intra-component: 4–8px  (gap-1, gap-2)
  Component padding: 16–20px (p-4, p-5)
  Section gap: 24px (space-y-6)
  Page padding: 16px mobile, 24px desktop (px-4 md:px-6)

Max content width: 72rem (max-w-6xl) — giữ nguyên hiện tại
Card border-radius:
  - Card lớn (section): rounded-xl (12px)
  - Card nhỏ (stat, info): rounded-lg (8px)
  - Badge/Tag: rounded-full
  - Nút bấm: rounded-lg (8px) — KHÔNG rounded-full cho nút hành động chính
```

### 3.4 Shadows & Elevation

```
Cấp 0 (flat):    shadow-none — thành phần trong card
Cấp 1 (resting): shadow-sm — card bình thường
Cấp 2 (hover):   shadow-md — card khi hover, dropdown
Cấp 3 (float):   shadow-lg — modal, toast notification
```

Không dùng `shadow-sm` đồng loạt cho mọi card. Card thông thường dùng `border` + `shadow-none`; chỉ card cần nổi bật (hero section, CTA) mới dùng `shadow-sm`.

---

## 4. Hệ thống Icon (Iconography)

### 4.1 Quy tắc bắt buộc

- **KHÔNG** dùng emoji hệ điều hành (`🏠`, `📋`, `✅`, `❌`, `💬`, `🔔`, `📚`, `👤`, `＋`) trong navigation, button, hoặc heading.
- Thay bằng **SVG inline** hoặc thư viện **Lucide React** (`lucide-react` — lightweight, tree-shakeable, MIT license).
- Kích thước chuẩn: `16px` (trong text/badge), `18px` (navigation/button), `20px` (page heading icon), `24px` (empty state illustration).
- Stroke width: `1.5px` (mảnh, thanh lịch) hoặc `2px` (nếu cần nổi bật hơn). Thống nhất một giá trị trong toàn dự án.
- Màu icon: Inherit từ text color của parent — KHÔNG tự đặt màu riêng cho icon trừ khi icon đóng vai trò trạng thái (ví dụ icon dấu check xanh).

### 4.2 Bảng ánh xạ Icon

```
Navigation (Bệnh nhân):
  Tổng quan    →  LayoutDashboard   (thay 🏠)
  Hồ sơ        →  UserCircle        (thay 👤)
  Tài liệu     →  BookOpen          (thay 📚)
  Chat AI      →  MessageSquare     (thay 💬)
  Nhắc lịch    →  Bell              (thay 🔔)

Navigation (Bác sĩ):
  Hàng chờ duyệt → ClipboardList    (thay 📋)

Actions:
  Bắt đầu đánh giá  → Plus           (thay ＋)
  Phê duyệt         → CheckCircle    (thay ✅)
  Từ chối            → XCircle        (thay ❌)
  Đăng xuất          → LogOut
  Chỉnh sửa          → Pencil
  Gửi câu hỏi       → Send
  Xóa hội thoại      → Trash2

Status:
  Red-flag           → AlertTriangle  (danger color)
  Chờ duyệt         → Clock
  Đã duyệt          → CheckCircle2   (success color)
  Từ chối            → XCircle        (muted color)

Misc:
  Nguồn guideline    → FileText
  Cảnh báo           → ShieldAlert
  Thông tin           → Info
```

---

## 5. Quy chuẩn Component (Component Guidelines)

### 5.1 Buttons

```
Hệ phân cấp nút:
  Primary   → bg brand-600, text white, hover brand-700
              Dùng cho: CTA chính mỗi trang (Bắt đầu đánh giá, Phê duyệt, Gửi)
              Tối đa 1 nút Primary mỗi viewport.

  Secondary → bg white, border border-default, text text-primary
              Dùng cho: Hành động phụ (Chỉnh sửa, Xem chi tiết)

  Ghost     → bg transparent, text text-secondary, hover bg surface-secondary
              Dùng cho: Đăng xuất, Xóa, Hủy

  Danger    → bg danger, text white
              Dùng cho: Xóa dữ liệu, Từ chối (CHỈ khi hành động không thể hoàn tác)
```

**Kích thước nút:**
- Default: `h-9 px-4 text-sm` (36px cao)
- Small: `h-8 px-3 text-xs` (32px cao — dùng trong bảng)
- Large: `h-11 px-6 text-base` (44px cao — CTA hero)

**Trạng thái:**
- Hover: Đổi background nhẹ, KHÔNG scale.
- Active/Pressed: `opacity-90`, KHÔNG `scale-95`.
- Loading: Hiển thị spinner NHỎ (`h-4 w-4`) bên trái text, text chuyển thành "Đang xử lý…", nút `disabled`.
- Disabled: `opacity-50`, `cursor-not-allowed`.

### 5.2 Cards

```
Card thông thường:
  bg-white rounded-xl border border-slate-200
  Padding: p-5 (20px)
  KHÔNG shadow mặc định (flat on surface)

Card nổi bật (Hero / CTA):
  bg-white rounded-xl border border-slate-200 shadow-sm
  Dùng cho: Welcome section, Quick action panel

Card tương tác (Clickable):
  bg-white rounded-xl border border-slate-200
  Hover: shadow-md, border-slate-300
  Transition: transition-shadow duration-150

Card trạng thái (Red-flag alert):
  bg-red-50 rounded-xl border-l-4 border-l-red-500
  KHÔNG dùng border-2 viền đỏ toàn bộ (quá kích động)
```

### 5.3 Chat Interface (Giao diện Chat AI)

```
Layout:
  - Chọn chủ đề: Pill tabs ngang (bệnh nhân bấm chọn), KHÔNG dùng <select> dropdown
  - Khu vực tin nhắn: Chiều cao cố định (h-[28rem]), overflow-y-auto, scroll tự động xuống cuối
  - Input: Sticky ở dưới, bo góc, nút gửi dạng icon (Send)

Bubble User:
  - Căn phải
  - bg-brand-600, text-white, rounded-2xl rounded-br-md
  - max-width: 80%

Bubble AI:
  - Căn trái
  - bg-slate-100, text-slate-800, rounded-2xl rounded-bl-md
  - max-width: 85%
  - Nếu có sources: hiển thị chips nhỏ "📄 Nguồn" bên dưới bubble, bấm mở rộng xem chi tiết
  - Nếu insufficient_evidence: thêm note nhỏ màu amber bên dưới

Avatar:
  - User: Vòng tròn nhỏ (h-7 w-7) có chữ viết tắt tên, bg-brand-100 text-brand-700
  - AI: Vòng tròn nhỏ (h-7 w-7) có icon Bot/Sparkles, bg-slate-200 text-slate-600

Quick Prompts (Gợi ý câu hỏi):
  - Hiển thị khi chưa có tin nhắn nào hoặc sau mỗi câu trả lời AI
  - Dạng chip/pill nhỏ: border border-slate-200 rounded-full px-3 py-1.5 text-sm
  - Hover: bg-brand-50 border-brand-300
  - Ví dụ: "Ai nên tầm soát ung thư vú?", "Chụp nhũ ảnh có đau không?"

Typing indicator:
  - 3 chấm nhấp nháy trong bubble AI khi đang chờ API response
```

### 5.4 Survey / Questionnaire (Khảo sát nguy cơ)

```
Layout:
  - Wizard dạng single-question-per-step (đã có)
  - Progress bar ở trên: dạng thanh ngang, hiển thị "Bước 2/8", có animation width transition

Question Card:
  - Card lớn chính giữa, max-w-2xl mx-auto
  - Câu hỏi: text-lg font-semibold, cỡ lớn rõ ràng

Option Cards (cho câu hỏi single/multi choice):
  - Dạng card lựa chọn lớn (KHÔNG radio button nhỏ xíu)
  - Mỗi option: border border-slate-200 rounded-lg p-4 cursor-pointer
  - Hover: border-brand-300 bg-brand-50
  - Selected: border-brand-500 bg-brand-50 ring-2 ring-brand-500/20
  - Có icon CheckCircle hiện ra khi selected

Navigation:
  - Nút "Tiếp" (Primary) bên phải
  - Nút "Quay lại" (Ghost) bên trái
  - Responsive: full-width trên mobile
```

### 5.5 Dashboard Bác sĩ

```
Metrics cards:
  - Grid 3 cột (responsive)
  - Mỗi card: icon + số lớn (text-2xl font-bold) + label nhỏ
  - Card "Chờ duyệt" có border-l-4 border-l-warning nếu count > 0
  - Card "Red-flag" có border-l-4 border-l-danger nếu count > 0

Session list:
  - Mỗi item: tên bệnh nhân (font-medium) + ngày tạo (text-xs text-secondary) + badge trạng thái
  - Red-flag items: có subtle bg-red-50 nền nhẹ toàn hàng
  - Hover: shadow-md, transition nhanh

Filter tabs:
  - Pill tabs ngang (giữ nguyên nhưng đổi style)
  - Active: bg brand-600, text white (Patient) HOẶC bg doctor-600, text white (Doctor)
  - Inactive: bg-slate-100, text-slate-600, hover bg-slate-200
```

### 5.6 PlanTable (Bảng khuyến nghị tầm soát)

```
Desktop (md+):
  - Dạng bảng rõ ràng, header cố định
  - Cột: Phương pháp | Tuổi bắt đầu | Chu kỳ | Ngày hẹn | Lý do | Nguồn
  - Hàng highlight: nếu next_due trong 30 ngày → bg-amber-50
  - Hàng priority cao → border-l-4 border-l-brand-500

Mobile:
  - Chuyển sang dạng card stack (mỗi hàng = 1 card)
  - Thông tin xếp dọc theo thứ tự quan trọng

Editable mode (Bác sĩ):
  - Input date dạng native date picker, KHÔNG custom calendar phức tạp
  - Nút "Thêm ghi chú" nhỏ inline
```

### 5.7 Loading & Empty States

```
Skeleton Loading:
  - Thay spinner đơn độc bằng skeleton UI
  - Skeleton card: rounded-lg bg-slate-200 animate-pulse
  - Skeleton text line: h-4 rounded bg-slate-200 animate-pulse, chiều rộng ngẫu nhiên (60%, 80%, 45%)
  - Hiển thị 2-3 skeleton items cho list

Empty State:
  - Icon minh họa (SVG line icon lớn, 48px, text-slate-300)
  - Heading: text-base font-medium text-slate-700
  - Subtext: text-sm text-slate-500
  - CTA (nếu có): nút Primary nhỏ
  - KHÔNG dùng emoji làm minh họa (❌ "📋" → ✅ SVG ClipboardList 48px)
```

---

## 6. Accessibility (Khả năng tiếp cận)

### 6.1 Bắt buộc tuân thủ

- **Tương phản màu**: Tối thiểu WCAG AA (4.5:1 cho text, 3:1 cho large text và icon).
- **Focus visible**: Mọi phần tử tương tác PHẢI có outline khi focus (outline-2 outline-offset-2 outline-brand-500).
- **Aria labels**: Mọi nút icon-only phải có `aria-label`. Mọi vùng nội dung chính phải có `role` hoặc `aria-label` phù hợp.
- **Keyboard navigation**: Tab order phải logic. Dropdown/modal phải trap focus.
- **Screen reader**: Badge trạng thái phải có text ẩn (đã có `SessionStatusBadge` — giữ nguyên pattern này).

### 6.2 Y tế đặc thù

- Thông tin Red-flag PHẢI có `role="alert"` để screen reader đọc ngay.
- Disclaimer PHẢI có `role="note"`.
- Không dùng màu đỏ là phương tiện DUY NHẤT để truyền đạt thông tin (kết hợp icon + text + border).

---

## 7. Responsive Breakpoints

```
sm:  640px   — Mobile landscape
md:  768px   — Tablet portrait (chuyển layout chính tại đây)
lg:  1024px  — Tablet landscape / laptop nhỏ
xl:  1280px  — Desktop
2xl: 1536px  — Wide desktop

Mobile-first: Viết CSS/class cho mobile trước, dùng sm:/md:/lg: để nâng cấp.
```

**Layout rules:**
- Navigation: Ngang trên md+, hamburger menu trên mobile (chưa triển khai — kế hoạch tuần sau).
- Dashboard grid: 1 cột mobile, 2 cột sm, 3-4 cột md+.
- Chat: Full-width trên mobile, max-w-3xl trên desktop.
- Survey: max-w-2xl centered mọi breakpoint.

---

## 8. Cấu trúc thư mục Frontend

```
frontend/src/
├── app/                          # Next.js App Router pages
│   ├── globals.css               # Design tokens, base styles, component classes
│   ├── layout.tsx                # Root layout (font import, metadata)
│   ├── page.tsx                  # Redirect hub
│   ├── login/page.tsx            # Login/Register
│   ├── doctor/                   # Khu vực Bác sĩ
│   │   ├── layout.tsx            # RoleGuard("doctor")
│   │   ├── page.tsx              # Dashboard + hàng chờ
│   │   └── sessions/[id]/page.tsx # Chi tiết phiên + phê duyệt
│   └── patient/                  # Khu vực Bệnh nhân
│       ├── layout.tsx            # RoleGuard("patient")
│       ├── page.tsx              # Dashboard
│       ├── profile/page.tsx      # Hồ sơ sức khỏe
│       ├── survey/page.tsx       # Khảo sát nguy cơ
│       ├── results/[id]/page.tsx # Kết quả phiên
│       ├── chat/page.tsx         # Chat AI
│       ├── education/page.tsx    # Tài liệu giáo dục
│       └── reminders/page.tsx    # Lịch nhắc
├── components/                   # Shared components
│   ├── icons/                    # (TẠO MỚI) Barrel file export SVG icons
│   ├── ui/                       # (TẠO MỚI) Primitives: Button, Card, Badge, Skeleton
│   ├── RoleGuard.tsx             # Layout shell + nav
│   ├── PlanTable.tsx             # Bảng khuyến nghị
│   ├── PatientQuestionBox.tsx    # Hộp hỏi đáp kết quả
│   ├── Disclaimer.tsx            # Disclaimer bắt buộc
│   ├── RedFlagAlert.tsx          # Cảnh báo Red-flag
│   └── SessionStatusBadge.tsx    # Badge trạng thái
├── lib/                          # Utilities
│   ├── api.ts                    # API client + mock switch
│   └── auth.ts                   # Auth helpers
├── mocks/                        # Mock data cho phát triển
│   ├── fixtures.ts
│   └── handlers.ts
└── types/
    └── api.ts                    # TypeScript interfaces
```

---

## 9. Quy trình triển khai theo tuần

### Tuần hiện tại (Tuần 4): Nền tảng Design System

**Ưu tiên 1 — Thiết lập nền:**
1. Cài `lucide-react` vào dependencies
2. Cập nhật `tailwind.config.ts`: Thêm màu brand (teal), doctor (indigo), font Inter
3. Viết lại `globals.css`: Áp dụng design tokens, cập nhật component classes (`.btn`, `.card`, `.input`, `.badge`)
4. Tạo `components/icons/index.tsx`: Barrel export từ lucide-react với size/stroke chuẩn

**Ưu tiên 2 — Layout chung:**
5. Refactor `RoleGuard.tsx`: Thay emoji bằng Lucide icons, áp dụng bảng màu mới, phân biệt Patient/Doctor tone
6. Refactor `login/page.tsx`: Logo mới, bảng màu mới, loại bỏ gradient generic

**Ưu tiên 3 — Components:**
7. Cập nhật `SessionStatusBadge.tsx`, `Disclaimer.tsx`, `RedFlagAlert.tsx` theo design tokens mới

### Tuần 5: Trải nghiệm bệnh nhân

1. Refactor `patient/page.tsx`: Dashboard mới, skeleton loading, stat cards
2. Refactor `patient/chat/page.tsx`: Bubble chat, quick prompts, typing indicator
3. Refactor `patient/survey/page.tsx`: Option cards, progress bar
4. Refactor `patient/results/[id]/page.tsx`: Áp dụng PlanTable mới, Red-flag redesign
5. Cập nhật `patient/education/page.tsx`, `patient/reminders/page.tsx`

### Tuần 6: Trải nghiệm bác sĩ & Polish

1. Refactor `doctor/page.tsx`: Metrics cards, filter pills, session list redesign
2. Refactor `doctor/sessions/[id]/page.tsx`: Trace panel, review form
3. Cập nhật `PlanTable.tsx`: Responsive, editable mode, timeline view
4. Mobile responsive pass: Hamburger nav, touch targets, viewport testing
5. Final polish: Consistency audit, accessibility audit

---

## 10. Checklist trước mỗi PR / Commit

Trước khi submit code frontend, kiểm tra:

- [ ] **Không có emoji** trong navigation, button, heading (grep cho các ký tự unicode emoji)
- [ ] **Bảng màu đúng**: Không dùng blue-600 mặc định; Patient dùng teal, Doctor dùng indigo
- [ ] **Tỷ lệ 60-30-10**: Không thêm màu mới ngoài hệ thống token
- [ ] **Không animation tự phát**: Không `fade-in` class trên section containers
- [ ] **Không `active:scale-95`** trên nút bấm
- [ ] **Skeleton loading**: Có thay spinner cho trang có fetch data
- [ ] **Empty state**: Có SVG icon + message, không emoji
- [ ] **Focus visible**: Tab qua các phần tử tương tác, outline phải hiện
- [ ] **Responsive**: Kiểm tra trên 375px (mobile) và 1280px (desktop)
- [ ] **Copy y tế**: Giọng điệu bình tĩnh, không gây hoảng loạn

---

## 11. Thư viện & Dependencies cho phép

| Package | Mục đích | Trạng thái |
|---|---|---|
| `next` 14.x | Framework | ✅ Đã có |
| `react` 18.x | UI Library | ✅ Đã có |
| `tailwindcss` 3.x | Utility CSS | ✅ Đã có |
| `lucide-react` | Icon library | 📦 Cần cài |
| `@fontsource/inter` | Font Inter local | 📦 Tùy chọn (hoặc dùng `next/font`) |
| `clsx` hoặc `tailwind-merge` | Class name utils | 📦 Tùy chọn |

**KHÔNG được cài** các thư viện UI nặng (MUI, Chakra, Ant Design, shadcn/ui) — dự án dùng Tailwind thuần để giữ bundle nhỏ và kiểm soát hoàn toàn thiết kế.

---

> **Ghi nhớ cuối cùng**: Mọi quyết định thiết kế đều phải trả lời được câu hỏi:
> *"Điều này giúp bệnh nhân bớt lo lắng hay giúp bác sĩ ra quyết định nhanh hơn?"*
> Nếu câu trả lời là "không" — bỏ đi.
