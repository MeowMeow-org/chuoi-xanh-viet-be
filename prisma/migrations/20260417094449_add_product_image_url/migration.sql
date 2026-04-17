-- DropIndex
DROP INDEX "idx_chat_conv_p1_updated";

-- DropIndex
DROP INDEX "idx_chat_conv_p2_updated";

-- AlterTable
ALTER TABLE "chat_conversations" RENAME CONSTRAINT "pk_chat_conversations" TO "chat_conversations_pkey";

-- AlterTable
ALTER TABLE "chat_messages" RENAME CONSTRAINT "pk_chat_messages" TO "chat_messages_pkey";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_url" VARCHAR(512);

-- CreateIndex
CREATE INDEX "idx_chat_conv_p1_updated" ON "chat_conversations"("participant_1_id", "updated_at");

-- CreateIndex
CREATE INDEX "idx_chat_conv_p2_updated" ON "chat_conversations"("participant_2_id", "updated_at");
