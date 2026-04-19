-- Cho phép lưu ha chính xác hơn khi quy đổi từ m² (vườn nhỏ vài chục m²).
ALTER TABLE "farms" ALTER COLUMN "area_ha" TYPE DECIMAL(14,6);
