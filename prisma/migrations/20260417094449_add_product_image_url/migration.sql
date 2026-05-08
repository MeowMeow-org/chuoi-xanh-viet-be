-- Chỉ thêm ảnh sản phẩm. (Các thao tác chat/index ở bản cũ chạy sai thứ tự shadow DB:
-- lúc này chat_conversations chưa có participant_1_id — schema đó được tạo ở 20260417120000.)

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_url" VARCHAR(512);
