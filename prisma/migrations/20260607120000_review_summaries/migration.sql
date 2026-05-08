-- CreateTable
CREATE TABLE "review_summaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" UUID NOT NULL,
    "overall_sentiment" VARCHAR(20) NOT NULL,
    "summary" TEXT NOT NULL,
    "positive_points" JSONB NOT NULL DEFAULT '[]',
    "negative_points" JSONB NOT NULL DEFAULT '[]',
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "action_items" JSONB NOT NULL DEFAULT '[]',
    "analyzed_count" INTEGER NOT NULL DEFAULT 0,
    "ignored_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2),
    "analyzed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_review_summaries_target" ON "review_summaries"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_review_summaries_target" ON "review_summaries"("target_type", "target_id");
