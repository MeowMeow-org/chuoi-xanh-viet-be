CREATE TABLE "telegram_diary_sessions" (
    "chat_id" VARCHAR(32) NOT NULL,
    "user_id" UUID NOT NULL,
    "step" VARCHAR(40) NOT NULL,
    "draft_data" JSONB,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "telegram_diary_sessions_pkey" PRIMARY KEY ("chat_id")
);

CREATE INDEX "idx_tg_diary_session_user" ON "telegram_diary_sessions"("user_id");
CREATE INDEX "idx_tg_diary_session_expires" ON "telegram_diary_sessions"("expires_at");

ALTER TABLE "telegram_diary_sessions"
ADD CONSTRAINT "fk_tg_diary_session_user"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
