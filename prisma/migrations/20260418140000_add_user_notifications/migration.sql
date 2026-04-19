-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('order', 'message', 'review', 'system', 'cooperative', 'forum');

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_user_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "type" "notification_type" NOT NULL,
    "title" VARCHAR(240) NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" VARCHAR(40),
    "entity_id" UUID,
    "dedupe_key" VARCHAR(200),
    "read_at" TIMESTAMP(6),
    "metadata" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_notifications_recipient_dedupe" ON "user_notifications"("recipient_user_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "idx_user_notifications_recipient_created" ON "user_notifications"("recipient_user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "fk_user_notifications_recipient" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_notifications" ADD CONSTRAINT "fk_user_notifications_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
