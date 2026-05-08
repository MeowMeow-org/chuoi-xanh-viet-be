-- Allow cooperative membership history per farm
DROP INDEX IF EXISTS "uq_coop_members_farm";

-- Query helper index for farm membership status
CREATE INDEX "idx_coop_members_farm_status"
ON "cooperative_members"("farm_id", "status");

-- Enforce at most one approved cooperative per farm at a time
CREATE UNIQUE INDEX "uq_coop_members_one_approved_per_farm"
ON "cooperative_members"("farm_id")
WHERE "status" = 'approved';
