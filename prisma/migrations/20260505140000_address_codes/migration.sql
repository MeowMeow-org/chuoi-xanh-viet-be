-- Chuẩn hóa địa chỉ VN: thêm code hành chính (province/district/ward).
-- Code dùng INT theo provinces.open-api.vn (province 1..96, district 4 chữ số, ward 5 chữ số).

-- farms: thêm 3 cột code (NULL = chưa chuẩn hóa).
ALTER TABLE "farms" ADD COLUMN "province_code" INT;
ALTER TABLE "farms" ADD COLUMN "district_code" INT;
ALTER TABLE "farms" ADD COLUMN "ward_code" INT;

-- Index để filter marketplace (province luôn có khi user filter; district/ward đi kèm).
CREATE INDEX "idx_farms_province_code" ON "farms" ("province_code");
CREATE INDEX "idx_farms_admin_codes" ON "farms" ("province_code", "district_code", "ward_code");

-- orders: tách shipping_address thành code + name + detail. Giữ shipping_address để backward-compat.
ALTER TABLE "orders" ADD COLUMN "shipping_province_code" INT;
ALTER TABLE "orders" ADD COLUMN "shipping_district_code" INT;
ALTER TABLE "orders" ADD COLUMN "shipping_ward_code" INT;
ALTER TABLE "orders" ADD COLUMN "shipping_province_name" VARCHAR(120);
ALTER TABLE "orders" ADD COLUMN "shipping_district_name" VARCHAR(120);
ALTER TABLE "orders" ADD COLUMN "shipping_ward_name" VARCHAR(120);
ALTER TABLE "orders" ADD COLUMN "shipping_detail" TEXT;
