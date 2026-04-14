-- CreateEnum
CREATE TYPE "cooperative_member_status" AS ENUM ('pending', 'approved', 'rejected', 'removed');

-- CreateTable
CREATE TABLE "cooperative_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cooperative_user_id" UUID NOT NULL,
    "farmer_user_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "status" "cooperative_member_status" NOT NULL DEFAULT 'pending',
    "requested_by" UUID,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(6),
    "note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cooperative_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_coop_members_cooperative_farm"
ON "cooperative_members"("cooperative_user_id", "farm_id");

-- CreateIndex
CREATE INDEX "idx_coop_members_cooperative_status"
ON "cooperative_members"("cooperative_user_id", "status");

-- CreateIndex
CREATE INDEX "idx_coop_members_farmer_status"
ON "cooperative_members"("farmer_user_id", "status");

-- AddForeignKey
ALTER TABLE "cooperative_members"
ADD CONSTRAINT "fk_coop_members_farm"
FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cooperative_members"
ADD CONSTRAINT "fk_coop_members_cooperative_user"
FOREIGN KEY ("cooperative_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cooperative_members"
ADD CONSTRAINT "fk_coop_members_farmer_user"
FOREIGN KEY ("farmer_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cooperative_members"
ADD CONSTRAINT "fk_coop_members_requested_by"
FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cooperative_members"
ADD CONSTRAINT "fk_coop_members_verified_by"
FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
