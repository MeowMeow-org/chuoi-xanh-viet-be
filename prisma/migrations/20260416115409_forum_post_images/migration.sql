-- CreateTable
CREATE TABLE "forum_post_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "object_key" VARCHAR(2048) NOT NULL,
    "file_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_post_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_forum_post_images_post_sort" ON "forum_post_images"("post_id", "sort_order");

-- AddForeignKey
ALTER TABLE "forum_post_images" ADD CONSTRAINT "fk_forum_post_images_post" FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
