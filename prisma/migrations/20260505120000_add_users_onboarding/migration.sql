-- AlterTable
ALTER TABLE "users" ADD COLUMN "onboarding" BOOLEAN NOT NULL DEFAULT false;

-- Coi user hiện tại đã qua onboarding (chỉ user mới sau migration mặc định false).
UPDATE "users" SET "onboarding" = true;
