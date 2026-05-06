# Test Cases — AI Diary Scan

Mỗi test case liệt kê thông tin vụ mùa và các bản ghi nhật ký cần nhập thủ công để kiểm tra. Kết quả mong đợi ghi rõ violation nào phải xuất hiện.

---

## TC-01 — SAFE (không có vi phạm)

**Vụ mùa:** Lúa, bắt đầu 2025-01-01, thu hoạch dự kiến 2025-04-15

| Ngày       | Loại          | Ghi chú                                      |
|------------|---------------|----------------------------------------------|
| 2025-01-01 | sowing        | Gieo hạt giống IR50404, mật độ 120 kg/ha     |
| 2025-01-20 | fertilizing   | Bón phân urê 50 kg/ha lần 1                  |
| 2025-02-10 | fertilizing   | Bón NPK lần 2                                |
| 2025-02-20 | pesticide     | Phun Validacin phòng khô vằn, pha 1 gói/bình |
| 2025-03-05 | pesticide     | Phun Tilt Super phòng đạo ôn                 |
| 2025-04-01 | irrigation    | Tháo nước trước thu hoạch 2 tuần             |
| 2025-04-15 | harvesting    | Thu hoạch, năng suất ước tính 6 tấn/ha       |
| 2025-04-16 | packing       | Đóng bao 50 kg, xuất kho 120 bao             |

**Kết quả mong đợi:** `overallRisk = safe`, `violations = []`

---

## TC-02 — PHI_VIOLATION (phun thuốc quá gần ngày thu hoạch, không rõ loại thuốc)

**Vụ mùa:** Rau cải, bắt đầu 2025-02-01, thu hoạch dự kiến 2025-04-10

| Ngày       | Loại        | Ghi chú                                        |
|------------|-------------|------------------------------------------------|
| 2025-02-01 | sowing      | Gieo cải ngọt                                  |
| 2025-02-15 | fertilizing | Bón phân NPK                                   |
| 2025-03-20 | pesticide   | Phun thuốc trừ sâu (không ghi tên thuốc)       |
| **2025-04-03** | **pesticide** | **Phun thuốc sâu** (7 ngày trước thu hoạch)   |
| 2025-04-10 | harvesting  | Thu hoạch cải ngọt                             |

**Kết quả mong đợi:** `PHI_VIOLATION`, severity ≥ `warning` — phun thuốc chỉ 7 ngày trước thu hoạch, chưa đủ 14 ngày cách ly tối thiểu.

---

## TC-03 — PHI_VIOLATION (phun nhóm lân hữu cơ quá gần thu hoạch)

**Vụ mùa:** Dưa leo, bắt đầu 2025-03-01, thu hoạch dự kiến 2025-05-20

| Ngày       | Loại        | Ghi chú                                                    |
|------------|-------------|------------------------------------------------------------|
| 2025-03-01 | sowing      | Trồng dưa leo F1                                           |
| 2025-03-20 | fertilizing | Bón DAP                                                    |
| 2025-04-10 | pesticide   | Phun Chlorpyrifos (nhóm lân hữu cơ) trị bọ trĩ            |
| **2025-05-05** | **pesticide** | **Phun Chlorpyrifos lần 2** (15 ngày trước thu hoạch)  |
| 2025-05-20 | harvesting  | Thu hoạch dưa leo                                          |

**Kết quả mong đợi:** `PHI_VIOLATION` severity `critical` — Chlorpyrifos (nhóm lân hữu cơ) cần cách ly 21-30 ngày, chỉ cách thu hoạch 15 ngày.

---

## TC-04 — BANNED_PESTICIDE (dùng thuốc bị cấm: Paraquat)

**Vụ mùa:** Sắn, bắt đầu 2025-01-10, thu hoạch dự kiến 2025-10-01

| Ngày       | Loại        | Ghi chú                                           |
|------------|-------------|---------------------------------------------------|
| 2025-01-10 | sowing      | Trồng hom sắn                                     |
| 2025-02-01 | fertilizing | Bón NPK 16-16-8                                   |
| **2025-03-15** | **pesticide** | **Phun Paraquat diệt cỏ giữa hàng**           |
| 2025-05-10 | fertilizing | Bón thúc lần 2                                    |
| 2025-09-20 | pesticide   | Phun Permethrin phòng nhện đỏ                     |
| 2025-10-01 | harvesting  | Thu hoạch sắn                                     |

**Kết quả mong đợi:** `BANNED_PESTICIDE`, severity `critical` — Paraquat bị cấm theo Thông tư 10/2020/TT-BNNPTNT.

---

## TC-05 — BANNED_PESTICIDE (dùng Carbofuran)

**Vụ mùa:** Lúa, bắt đầu 2025-02-01, thu hoạch dự kiến 2025-05-30

| Ngày       | Loại        | Ghi chú                                          |
|------------|-------------|--------------------------------------------------|
| 2025-02-01 | sowing      | Gieo mạ                                          |
| 2025-02-20 | fertilizing | Bón lót NPK                                      |
| **2025-03-01** | **pesticide** | **Rải Furadan (Carbofuran) trị sâu đục thân** |
| 2025-04-15 | pesticide   | Phun Propiconazole phòng nấm                     |
| 2025-05-30 | harvesting  | Thu hoạch                                        |

**Kết quả mong đợi:** `BANNED_PESTICIDE`, severity `critical` — Carbofuran (Furadan) nằm trong danh sách cấm.

---

## TC-06 — EXCESSIVE_PESTICIDE_FREQUENCY (phun thuốc quá nhiều trong 14 ngày)

**Vụ mùa:** Ớt, bắt đầu 2025-01-15, thu hoạch dự kiến 2025-05-01

| Ngày       | Loại        | Ghi chú                                |
|------------|-------------|----------------------------------------|
| 2025-01-15 | sowing      | Trồng cây ớt con                       |
| 2025-02-10 | fertilizing | Bón phân chuồng ủ hoai                 |
| **2025-03-01** | **pesticide** | Phun Abamectin trị nhện đỏ        |
| **2025-03-04** | **pesticide** | Phun Cypermethrin trị bọ trĩ      |
| **2025-03-07** | **pesticide** | Phun Mancozeb phòng thán thư      |
| **2025-03-10** | **pesticide** | Phun Imidacloprid trị rầy mềm    |
| **2025-03-13** | **pesticide** | Phun hỗn hợp trừ sâu tổng hợp   |
| 2025-04-20 | harvesting  | Thu hoạch ớt đợt 1                    |

**Kết quả mong đợi:** `EXCESSIVE_PESTICIDE_FREQUENCY` — 5 lần phun trong 13 ngày (01/03 → 13/03), vượt ngưỡng 4 lần/14 ngày.

---

## TC-07 — EXCESSIVE_PESTICIDE_FREQUENCY (bón phân quá gần thu hoạch)

**Vụ mùa:** Rau muống, bắt đầu 2025-03-01, thu hoạch dự kiến 2025-04-20

| Ngày       | Loại          | Ghi chú                                          |
|------------|---------------|--------------------------------------------------|
| 2025-03-01 | sowing        | Gieo hạt rau muống                               |
| 2025-03-15 | fertilizing   | Bón urê tưới                                     |
| **2025-04-15** | **fertilizing** | **Bón đạm tăng xanh** (5 ngày trước thu hoạch) |
| 2025-04-20 | harvesting    | Cắt rau muống đợt 1                              |

**Kết quả mong đợi:** `EXCESSIVE_PESTICIDE_FREQUENCY` (fertilizing trong 7 ngày trước harvest) — severity ≥ `warning`.

---

## TC-08 — SUSPICIOUS_DIARY_PATTERN (nhập liệu hàng loạt, gian lận thời gian)

> Giả lập: tất cả entries được tạo cùng một ngày (`recordedAt` giống nhau) nhưng `event_date` trải dài nhiều tháng.
> Khi nhập thực tế: nhập tất cả bản ghi trong cùng một buổi (cùng ngày server_timestamp).

**Vụ mùa:** Ngô, bắt đầu 2025-01-01, thu hoạch dự kiến 2025-04-20

| Ngày event | RecordedAt (mô phỏng) | Loại        | Ghi chú                    |
|------------|----------------------|-------------|----------------------------|
| 2025-01-01 | 2025-04-18           | sowing      | Gieo ngô nếp               |
| 2025-01-20 | 2025-04-18           | fertilizing | Bón lót                    |
| 2025-02-10 | 2025-04-18           | fertilizing | Bón thúc lần 1             |
| 2025-03-01 | 2025-04-18           | pesticide   | Phun thuốc sâu             |
| 2025-03-20 | 2025-04-18           | fertilizing | Bón kali                   |
| 2025-04-15 | 2025-04-18           | harvesting  | Thu hoạch ngô              |

**Kết quả mong đợi:** `SUSPICIOUS_DIARY_PATTERN` — nhiều bản ghi trải dài 3+ tháng nhưng recordedAt chênh nhau dưới 1 ngày.

---

## TC-09 — SUSPICIOUS_DIARY_PATTERN (khoảng trống ghi chép > 45 ngày)

**Vụ mùa:** Cà phê, bắt đầu 2025-01-01, thu hoạch dự kiến 2025-11-01

| Ngày       | Loại        | Ghi chú                               |
|------------|-------------|---------------------------------------|
| 2025-01-01 | sowing      | Trồng cây cà phê con                  |
| 2025-01-20 | fertilizing | Bón phân chuồng                       |
| 2025-02-05 | pesticide   | Phun nấm trừ rệp sáp                  |
| *(không có bản ghi nào từ 06/02 đến 05/04 — 58 ngày trống)* |
| 2025-04-05 | fertilizing | Bón NPK sau mưa đầu mùa              |
| 2025-10-15 | harvesting  | Thu hoạch cà phê chín đỏ             |

**Kết quả mong đợi:** `SUSPICIOUS_DIARY_PATTERN` — khoảng trống 58 ngày liên tiếp giữa vụ (06/02 → 05/04).

---

## TC-10 — MISSING_KEY_ACTIVITY (có thu hoạch nhưng không có gieo hạt)

**Vụ mùa:** Lúa, bắt đầu 2025-02-01, thu hoạch dự kiến 2025-05-15

| Ngày       | Loại        | Ghi chú                          |
|------------|-------------|----------------------------------|
| 2025-02-15 | fertilizing | Bón lót NPK trước cấy            |
| 2025-03-01 | fertilizing | Bón thúc lần 1                   |
| 2025-03-20 | pesticide   | Phun trừ sâu cuốn lá             |
| 2025-04-10 | irrigation  | Tháo nước                        |
| 2025-05-15 | harvesting  | Thu hoạch lúa                    |

**Kết quả mong đợi:** `MISSING_KEY_ACTIVITY` — không có bản ghi `sowing` nhưng có `harvesting`.

---

## TC-11 — MISSING_KEY_ACTIVITY (không có bón phân trong cả vụ lúa)

**Vụ mùa:** Lúa, bắt đầu 2025-02-01, thu hoạch dự kiến 2025-05-20

| Ngày       | Loại       | Ghi chú                        |
|------------|------------|--------------------------------|
| 2025-02-01 | sowing     | Gieo mạ                        |
| 2025-02-20 | pesticide  | Phun trừ ốc bươu vàng          |
| 2025-03-15 | pesticide  | Phun trừ rầy nâu               |
| 2025-04-10 | irrigation | Tưới nước                      |
| 2025-05-20 | harvesting | Thu hoạch                      |

**Kết quả mong đợi:** `MISSING_KEY_ACTIVITY` — vụ lúa không có bất kỳ bản ghi `fertilizing` nào.

---

## TC-12 — SEQUENCE_VIOLATION (thu hoạch trước khi gieo hạt) — Programmatic

**Vụ mùa:** Ngô, bắt đầu 2025-01-01, thu hoạch dự kiến 2025-04-10

| Ngày       | Loại       | Ghi chú                   |
|------------|------------|---------------------------|
| **2025-03-01** | **harvesting** | Thu hoạch ngô     |
| 2025-03-20 | fertilizing | Bón phân lần 1            |
| **2025-04-01** | **sowing**     | Gieo hạt ngô      |

**Kết quả mong đợi:** `SEQUENCE_VIOLATION`, severity `critical` — thu hoạch (01/03) xảy ra trước gieo hạt (01/04).

---

## TC-13 — SEQUENCE_VIOLATION (đóng gói trước thu hoạch) — Programmatic

**Vụ mùa:** Cà rốt, bắt đầu 2025-01-10, thu hoạch dự kiến 2025-04-01

| Ngày       | Loại       | Ghi chú                           |
|------------|------------|-----------------------------------|
| 2025-01-10 | sowing     | Gieo hạt cà rốt                   |
| 2025-02-01 | fertilizing | Bón NPK                          |
| **2025-03-25** | **packing** | Đóng gói 500 hộp xuất chợ    |
| **2025-04-01** | **harvesting** | Thu hoạch cà rốt          |

**Kết quả mong đợi:** `SEQUENCE_VIOLATION`, severity `critical` — đóng gói (25/03) xảy ra trước thu hoạch (01/04).

---

## TC-14 — SEQUENCE_VIOLATION (thời gian canh tác quá ngắn) — Programmatic

**Vụ mùa:** Lúa, bắt đầu 2025-03-01, thu hoạch dự kiến 2025-04-01

| Ngày       | Loại       | Ghi chú              |
|------------|------------|----------------------|
| 2025-03-01 | sowing     | Gieo mạ              |
| 2025-03-10 | fertilizing | Bón lót             |
| 2025-03-20 | pesticide  | Phun thuốc sâu       |
| **2025-03-20** | **harvesting** | Thu hoạch lúa |

**Kết quả mong đợi:** `SEQUENCE_VIOLATION`, severity `warning` — chỉ 19 ngày từ gieo đến thu hoạch, thấp hơn mức tối thiểu 30 ngày.

---

## TC-15 — Multi-violation (nhiều vi phạm cùng lúc → critical)

**Vụ mùa:** Rau cải, bắt đầu 2025-02-01, thu hoạch dự kiến 2025-04-15

| Ngày       | Loại        | Ghi chú                                                   |
|------------|-------------|-----------------------------------------------------------|
| 2025-02-01 | sowing      | Gieo cải xanh                                             |
| 2025-02-15 | fertilizing | Bón NPK                                                   |
| **2025-03-01** | **pesticide** | **Phun Endosulfan** trị sâu (thuốc bị cấm)            |
| 2025-03-05 | pesticide   | Phun Cypermethrin                                         |
| 2025-03-08 | pesticide   | Phun Abamectin                                            |
| 2025-03-11 | pesticide   | Phun Mancozeb                                             |
| 2025-03-14 | pesticide   | Phun hỗn hợp                                              |
| **2025-04-10** | **pesticide** | **Phun thuốc không rõ tên** (5 ngày trước thu hoạch)  |
| 2025-04-15 | harvesting  | Thu hoạch                                                 |

**Kết quả mong đợi:**
- `BANNED_PESTICIDE` critical — Endosulfan bị cấm
- `EXCESSIVE_PESTICIDE_FREQUENCY` — 5 lần phun từ 01/03 đến 14/03
- `PHI_VIOLATION` — phun thuốc 5 ngày trước thu hoạch
- `overallRisk = critical`

---

## Ghi chú sử dụng

- Nhập từng bộ dữ liệu vào một vụ mùa riêng biệt để tránh nhiễu chéo.
- Với TC-08, cần nhập tất cả entries trong cùng một ngày thực tế để `server_timestamp` (recordedAt) trùng nhau.
- Trường `event_type` phải khớp chính xác: `sowing`, `fertilizing`, `pesticide`, `harvesting`, `packing`, `irrigation`, `other`.
- Tên thuốc cần ghi rõ trong phần **Ghi chú** (description) để AI nhận diện được.
