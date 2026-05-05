-- Telegram thông báo nông dân: chat_id + token deep link (?start=)
ALTER TABLE "users" ADD COLUMN "telegram_chat_id" VARCHAR(32);

CREATE TABLE "telegram_link_tokens" (
    "token" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "idx_telegram_link_user" ON "telegram_link_tokens"("user_id");
CREATE INDEX "idx_telegram_link_expires" ON "telegram_link_tokens"("expires_at");

ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
