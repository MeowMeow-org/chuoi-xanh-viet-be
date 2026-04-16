ALTER TABLE "season_anchors"
DROP CONSTRAINT IF EXISTS "season_anchors_season_id_key";

ALTER TABLE "season_anchors"
ADD COLUMN "checkpoint_no" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "checkpoint_type" VARCHAR(30) NOT NULL DEFAULT 'manual',
ADD COLUMN "is_final" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "payload_range" JSONB;

CREATE UNIQUE INDEX "uq_season_anchor_checkpoint"
ON "season_anchors" ("season_id", "checkpoint_no");

CREATE INDEX "idx_season_anchors_season_created_at"
ON "season_anchors" ("season_id", "created_at");
