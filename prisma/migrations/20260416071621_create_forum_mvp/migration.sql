-- CreateEnum
CREATE TYPE "forum_post_status" AS ENUM ('active', 'hidden', 'locked');

-- DropIndex
DROP INDEX "season_anchors_season_id_key";

-- AlterTable
ALTER TABLE "season_anchors" ALTER COLUMN "checkpoint_no" DROP DEFAULT;

-- CreateTable
CREATE TABLE "forum_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "author_user_id" UUID NOT NULL,
    "title" VARCHAR(220) NOT NULL,
    "content" TEXT NOT NULL,
    "status" "forum_post_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_post_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_forum_posts_author_created" ON "forum_posts"("author_user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_forum_posts_status_created" ON "forum_posts"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_forum_comments_post_created" ON "forum_comments"("post_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_forum_comments_author_created" ON "forum_comments"("author_user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_forum_labels_label_created" ON "forum_post_labels"("label", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_forum_post_label" ON "forum_post_labels"("post_id", "label");

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "fk_forum_posts_author" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "fk_forum_comments_post" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_comments" ADD CONSTRAINT "fk_forum_comments_author" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "forum_post_labels" ADD CONSTRAINT "fk_forum_labels_post" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
