-- Enforce one cooperative_members record per farm
DROP INDEX IF EXISTS "uq_coop_members_cooperative_farm";

CREATE UNIQUE INDEX "uq_coop_members_farm"
ON "cooperative_members"("farm_id");
