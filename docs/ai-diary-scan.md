# AI Diary Scan — FE Implementation Spec

> Tài liệu này dành cho Claude Code phía FE. Đọc toàn bộ trước khi bắt đầu code.

---

## 1. Tổng quan tính năng

Tính năng cho phép **nông dân / cán bộ HTX / admin** yêu cầu AI quét toàn bộ nhật ký canh tác của một vụ mùa (`season`) và nhận lại danh sách vi phạm an toàn thực phẩm kèm đánh giá tổng thể.

**Luồng người dùng cơ bản:**
1. Người dùng vào trang chi tiết vụ mùa (season detail)
2. Bấm nút "Kiểm tra AI" → gọi API scan
3. Chờ kết quả (API gọi OpenAI, ~5–15 giây)
4. Hiển thị kết quả: badge rủi ro + danh sách vi phạm + tóm tắt AI
5. Kết quả được lưu tự động vào diary → lần sau vào trang có thể đọc lại từ diary entries

---

## 2. API

### 2.1 Trigger scan

```
POST /api/diary/scan/:season_id
Authorization: Bearer <access_token>
```

- **Không có request body**
- `season_id`: UUID của vụ mùa
- **Auth**: farmer (chủ farm), cooperative (thành viên HTX quản lý farm đó), admin
- **Thời gian xử lý**: 5–15 giây (gọi OpenAI) — bắt buộc hiển thị loading state
- **Rate limit**: không giới hạn phía backend hiện tại, nhưng nên disable nút trong lúc đang chờ

**Success response** `200 OK`:

```json
{
  "message": "Kiểm tra nhật ký AI thành công",
  "data": {
    "seasonId": "uuid",
    "scannedAt": "2026-05-05T10:30:00.000Z",
    "overallRisk": "warning",
    "violations": [
      {
        "severity": "warning",
        "code": "PHI_VIOLATION",
        "title": "Phun thuốc gần ngày thu hoạch",
        "detail": "Ngày 20/04, ghi nhận phun thuốc trừ sâu cách ngày thu hoạch dự kiến (01/05) chỉ 11 ngày — thấp hơn ngưỡng an toàn tối thiểu 14 ngày.",
        "relatedEntryIds": ["uuid-entry-1"],
        "recommendation": "Không phun thuốc trong vòng 14 ngày trước thu hoạch. Nếu bắt buộc, dùng thuốc sinh học có PHI ngắn hơn và ghi rõ tên hoạt chất."
      }
    ],
    "summary": "Vụ lúa đông xuân có chất lượng ghi chép nhật ký tương đối đầy đủ với 24 bản ghi trải đều trong 90 ngày. Điểm tích cực là nông dân đã ghi nhận đầy đủ các bước từ làm đất đến thu hoạch. Tuy nhiên, phát hiện một lần phun thuốc quá gần ngày thu hoạch cần được lưu ý. Khuyến nghị nông dân theo dõi chặt thời gian cách ly thuốc BVTV và ghi rõ tên thương mại/hoạt chất khi ghi nhật ký."
  }
}
```

### 2.2 Các error response cần xử lý

| HTTP | `message` (tiếng Việt) | Nguyên nhân | Xử lý FE |
|------|------------------------|-------------|-----------|
| 400 | `"Vụ mùa chưa có nhật ký canh tác để kiểm tra"` | Season không có diary entry nào | Toast error, không mở modal kết quả |
| 403 | `"Không tìm thấy nông trại hoặc bạn không có quyền"` | User không phải chủ farm/HTX quản lý | Toast error |
| 404 | `"Không tìm thấy mùa vụ"` | seasonId không tồn tại | Toast error |
| 500 | `"Tạo nội dung AI thất bại. Vui lòng thử lại sau"` | OpenAI call failed | Toast error với nội dung gốc |

---

## 3. Kiểu dữ liệu TypeScript

```typescript
export type ScanSeverity = 'info' | 'warning' | 'critical'
export type OverallRisk = 'safe' | 'warning' | 'critical'

export interface ScanViolation {
  severity: ScanSeverity
  code: string   // 'PHI_VIOLATION' | 'BANNED_PESTICIDE' | 'SEQUENCE_VIOLATION' | 'EXCESSIVE_PESTICIDE_FREQUENCY' | 'SUSPICIOUS_DIARY_PATTERN' | 'MISSING_KEY_ACTIVITY'
  title: string
  detail: string
  relatedEntryIds: string[]  // có thể là mảng rỗng
  recommendation: string
}

export interface DiaryScanResult {
  seasonId: string
  scannedAt: string        // ISO 8601
  overallRisk: OverallRisk
  violations: ScanViolation[]
  summary: string
}
```

---

## 4. Thiết kế UI

### 4.1 Entry point — Nút "Kiểm tra AI"

Đặt nút này trên trang **Chi tiết vụ mùa** (season detail), trong section nhật ký canh tác (diary section).

**Hiển thị điều kiện:**
- Hiện nút với tất cả role được phép (farmer chủ farm, cooperative thành viên HTX, admin)
- Ẩn nút nếu người dùng không có quyền (tránh gọi API rồi nhận 403)

**Trạng thái nút:**

```
[Kiểm tra AI ✦]          ← idle, icon sparkle/AI
[Đang kiểm tra...]        ← loading, disabled, spinner
[Xem kết quả lần trước]  ← khi đã có scan result trong diary entries
```

> **Lưu ý:** Kết quả scan được backend tự động lưu vào diary_entries với `event_type = "other"` và `extra_data.type = "ai_scan_result"`. FE có thể đọc kết quả cũ từ diary list mà không cần gọi lại scan API.

### 4.2 Loading state

Vì API mất 5–15 giây:
- Hiển thị skeleton hoặc spinner với text `"AI đang phân tích nhật ký của bạn..."`
- Disable nút scan trong thời gian chờ
- **Không** timeout phía FE trong khoảng thời gian hợp lý (30s là đủ)

### 4.3 Hiển thị kết quả

Gợi ý dùng **modal** hoặc **drawer** (bottom sheet trên mobile, side panel trên desktop).

#### 4.3.1 Header — Overall Risk Badge

Hiển thị `overallRisk` nổi bật nhất:

| `overallRisk` | Màu sắc | Icon | Label |
|---------------|---------|------|-------|
| `"safe"` | Xanh lá (`green-500`) | ✓ checkmark | An toàn |
| `"warning"` | Vàng cam (`amber-500`) | ⚠ warning | Cần lưu ý |
| `"critical"` | Đỏ (`red-600`) | ✕ / alert | Vi phạm nghiêm trọng |

Dưới badge hiển thị thời gian quét: `"Kiểm tra lúc: 10:30 - 05/05/2026"`

#### 4.3.2 Danh sách Violations

Nếu `violations.length === 0`: hiển thị empty state với icon và text `"Không phát hiện vi phạm nào"`.

Mỗi violation là một card/accordion với:

```
┌─────────────────────────────────────────────┐
│ [BADGE severity]  Title của vi phạm          │
│                                              │
│ Detail: mô tả chi tiết vi phạm...            │
│                                              │
│ Khuyến nghị: nội dung recommendation...      │
│                                              │
│ [Xem nhật ký liên quan →]  ← nếu có relatedEntryIds
└─────────────────────────────────────────────┘
```

**Màu badge severity:**

| `severity` | Style |
|------------|-------|
| `"info"` | Xanh dương nhạt (`blue-400`), label: "Thông tin" |
| `"warning"` | Vàng cam (`amber-500`), label: "Cảnh báo" |
| `"critical"` | Đỏ đậm (`red-600`), label: "Nghiêm trọng" |

**Sắp xếp violations:** `critical` → `warning` → `info`

**Nút "Xem nhật ký liên quan":** Chỉ hiện khi `relatedEntryIds.length > 0`. Khi bấm, điều hướng/scroll đến diary entry tương ứng (truyền ids để highlight).

#### 4.3.3 Tóm tắt AI (`summary`)

Hiển thị sau danh sách violations, trong một box riêng với nền nhạt hơn. Đây là đoạn văn liền mạch 3–5 câu tiếng Việt do AI viết.

```
┌─ Nhận xét của AI ──────────────────────────┐
│                                             │
│  [summary text ở đây]                       │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.4 Violation codes — ánh xạ icon/title gợi ý

FE có thể hardcode icon mapping để UX rõ ràng hơn (title đã có từ API nhưng icon thì không):

| `code` | Icon gợi ý | Mô tả ngắn |
|--------|-----------|------------|
| `PHI_VIOLATION` | 🕐 / clock | Thời gian cách ly thuốc |
| `BANNED_PESTICIDE` | ☠ / ban | Thuốc bị cấm |
| `SEQUENCE_VIOLATION` | 🔀 / swap | Sai trình tự kỹ thuật |
| `EXCESSIVE_PESTICIDE_FREQUENCY` | 📈 / spike | Tần suất bất thường |
| `SUSPICIOUS_DIARY_PATTERN` | 🔍 / search | Nhập liệu đáng ngờ |
| `MISSING_KEY_ACTIVITY` | ❌ / missing | Thiếu bước bắt buộc |

---

## 5. Đọc kết quả cũ từ Diary Entries

Backend lưu kết quả scan vào diary_entries. FE có thể detect và hiển thị lại kết quả cũ mà không cần gọi lại API.

**Cách nhận biết một diary entry là scan result:**

```typescript
const isScanResult = (entry: DiaryEntry): boolean =>
  entry.eventType === 'other' &&
  (entry.extraData as any)?.type === 'ai_scan_result'

// Lấy data:
const scanData = entry.extraData as {
  type: 'ai_scan_result'
  scannedAt: string
  overallRisk: OverallRisk
  violations: ScanViolation[]
  summary: string
}
```

**Gợi ý:** Khi render danh sách diary entries, ẩn các entry có `type === 'ai_scan_result'` khỏi danh sách nhật ký thông thường. Thay vào đó, hiển thị chúng như một "Scan Result Card" riêng ở đầu/cuối section diary.

---

## 6. Trường hợp edge case

| Tình huống | Xử lý |
|------------|-------|
| `violations = []` | Hiển thị badge `safe` + empty state "Không phát hiện vi phạm" |
| `relatedEntryIds = []` | Ẩn nút "Xem nhật ký liên quan" |
| `overallRisk = "critical"` | Có thể thêm warning banner nổi bật trên toàn modal, text đỏ nhấn mạnh yêu cầu xử lý trước khi nộp mùa vụ |
| Season status = `"anchored"` | Backend vẫn cho phép scan (read-only), nhưng không lưu kết quả mới. FE có thể ẩn nút nếu muốn |
| User không có quyền | Ẩn nút scan hoàn toàn (check role + farm ownership trước khi render) |
| Network timeout | Toast error `"Kiểm tra thất bại. Vui lòng thử lại sau"` |

---

## 7. Tích hợp với Anchor Flow (quan trọng)

> Backend hiện tại **chưa** block anchor khi có `critical` violation. Đây là tính năng sẽ thêm sau.
> FE **không** cần implement guard này ngay bây giờ.

Khi backend thêm guard vào anchor flow, response của `POST /seasons/:id/status` sẽ trả về 422 kèm scan result nếu bị block. FE sẽ cần hiển thị danh sách violations trong màn hình confirm anchor. Chuẩn bị UI component `<ScanViolationList />` có thể tái sử dụng cho cả hai nơi.

---

## 8. Checklist triển khai cho FE

- [ ] Thêm type `DiaryScanResult`, `ScanViolation`, `ScanSeverity`, `OverallRisk` vào type definitions
- [ ] Thêm API function `scanDiarySeason(seasonId: string): Promise<DiaryScanResult>`
- [ ] Tạo component `<OverallRiskBadge risk={overallRisk} />`
- [ ] Tạo component `<ScanViolationCard violation={violation} onViewEntries={...} />`
- [ ] Tạo component `<ScanViolationList violations={violations} />`
- [ ] Tạo component `<DiaryScanResultModal result={result} isOpen={...} onClose={...} />`
- [ ] Tích hợp nút "Kiểm tra AI" vào trang season detail
- [ ] Xử lý loading state (5–15 giây)
- [ ] Xử lý các error codes từ API
- [ ] Filter diary entries ẩn `ai_scan_result` entries khỏi danh sách nhật ký thông thường
- [ ] Hiển thị scan result cũ từ diary entries (nếu đã có)
