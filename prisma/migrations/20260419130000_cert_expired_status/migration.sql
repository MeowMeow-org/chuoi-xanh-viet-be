-- Thêm giá trị 'expired' vào hai enum trạng thái chứng chỉ.
-- Postgres yêu cầu ALTER TYPE ADD VALUE chạy ngoài transaction block
-- để tránh lỗi "ALTER TYPE ... ADD cannot run inside a transaction block".
-- Prisma migrate áp dụng mỗi statement độc lập nên OK.

ALTER TYPE "farm_cert_status" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "coop_cert_status" ADD VALUE IF NOT EXISTS 'expired';
