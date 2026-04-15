-- CreateTable
CREATE TABLE "diary_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "diary_entry_id" UUID NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" VARCHAR(120),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diary_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_diary_attachments_entry_sort" ON "diary_attachments"("diary_entry_id", "sort_order");

ALTER TABLE "diary_attachments" ADD CONSTRAINT "fk_diary_attachments_entry" FOREIGN KEY ("diary_entry_id") REFERENCES "diary_entries"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
