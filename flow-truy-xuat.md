# Flow Truy Xuat Nguon Goc (No-IoT)

Tai lieu nay mo ta luong truy xuat khi chua co IoT, tap trung vao bang chung anh, metadata he thong, xac minh HTX va anchor on-chain.

## 1) Muc tieu luong

- Dam bao du lieu de kiem chung, khong chi la khai bao tay.
- Cho phep chinh sua trong giai doan lam viec, nhung dong bang sau khi chot mua vu.
- Tao trai nghiem quet QR de nguoi mua "nhin thay" hanh trinh va muc do uy tin.

## 2) Vong doi mua vu (state machine de code)

- `draft`: Dang ghi nhat ky, cho phep tao/sua/xoa.
- `ready_to_anchor`: Da du dieu kien chot (du nhat ky toi thieu, qua check rule).
- `anchored`: Da ghi hash len chain, khong cho sua record cu.
- `amended` (tuy chon): Co dieu chinh sau anchor theo co che append-only va tao anchor moi.

## 3) Flow nghiep vu end-to-end

### Buoc 1: Khoi tao farm + season

- Farmer tao season cho farm.
- He thong luu metadata khoi tao: owner, vi tri farm, thoi gian tao.

### Buoc 2: Ghi nhat ky canh tac (off-chain)

- Moi su kien canh tac duoc tao trong `diary_entries` (lam dat, gieo, bon, phun, thu hoach...).
- Moi ban ghi nen co:
  - `server_timestamp` (thoi gian may chu),
  - `actor_user_id`,
  - `event_type`, `event_date`,
  - anh/chung tu lien quan,
  - `extra_data` (GPS, ghi chu, vat tu).

### Buoc 3: Xac minh cheo (human verification)

- Can bo HTX hoac kiem soat vien co the danh dau xac minh dot.
- Ket qua xac minh duoc luu rieng (khong ghi de len nhat ky goc).

### Buoc 4: Seal va anchor on-chain

- Khi season dat trang thai `ready_to_anchor`, he thong tao "canonical payload" tu toan bo nhat ky.
- Tinh `data_hash` (VD: SHA-256), sau do ghi hash len blockchain.
- Luu ket qua vao `season_anchors`: `data_hash`, `tx_hash`, `tx_url`, `anchored_at`, `status`.
- Chuyen season sang `anchored`.

### Buoc 5: Sinh QR truy xuat

- Moi don vi ban (sale unit/lo san pham) co `qr_token` rieng.
- QR tro toi trang public truy xuat:
  - thong tin farm/season,
  - timeline su kien chinh,
  - bang chung anh,
  - trang thai anchor on-chain,
  - thong tin xac minh HTX.

## 4) Xu ly bai toan "du lieu co the bi sua truoc khi anchor"

Day la hanh vi cho phep trong giai doan `draft`. Cach kiem soat:

- Rule quyen: chi owner/cooperative/admin moi duoc thao tac phu hop.
- Lich su thao tac: luu audit log ai sua, sua gi, luc nao.
- Geofencing (neu app ho tro): chi cho ghi nhat ky trong vung farm.
- Back-date guard: khong cho nhap "ngay gia" vuot qua nguong cho phep.
- Sau `anchored`: khong sua ban ghi cu; neu can sua thi append ban ghi dieu chinh + anchor lai.

## 5) "Uy tin" tinh nhu the nao

Khong dung 1 co duy nhat. Nen gom nhieu tin hieu:

- Muc do day du cua nhat ky.
- Chat luong bang chung (anh + metadata hop le).
- Co xac minh HTX hay khong.
- Da anchor on-chain hay chua.
- Lich su giao dich/review (giai doan e-commerce).

Goi y badge hien thi nhanh cho user:

- `Basic`: co nhat ky, chua anchor.
- `Verified`: co xac minh HTX/can bo.
- `Trusted`: da anchor + lich su van hanh tot.

## 6) Du lieu toi thieu can co tren backend

- `seasons`: trang thai mua vu (`draft/ready_to_anchor/anchored/...`).
- `diary_entries`: du lieu su kien canh tac.
- `season_anchors`: bang chung anchor on-chain.
- `sale_units` + `trace_scans`: QR va lich su quet.
- (Khuyen nghi) bang xac minh HTX/member de tang do tin cay.

## 7) Nguyen tac hien thi cho nguoi tieu dung

- Uu tien "su that truc quan": timeline + anh + moc thoi gian.
- Hien thi ro "bang chung chuoi":
  - Hash da anchor,
  - tx hash/tx url,
  - ket qua verify `match/mismatch`.
- Minh bach ca su kien bat thuong da duoc xu ly (khong lam dep du lieu gia tao).