-- Đánh dấu đã đọc theo user + hội thoại (tin nhắn từ đối phương sau last_read_at = chưa đọc)
CREATE TABLE "chat_conversation_reads" (
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "last_read_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pk_chat_conversation_reads" PRIMARY KEY ("conversation_id","user_id"),
    CONSTRAINT "fk_chat_read_conv" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "fk_chat_read_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "idx_chat_read_user" ON "chat_conversation_reads"("user_id");
