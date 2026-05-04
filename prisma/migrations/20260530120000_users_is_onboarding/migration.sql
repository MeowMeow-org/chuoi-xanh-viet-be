-- Thay cột onboarding (true = đã xong) bằng is_onboarding (true = còn trong flow).
ALTER TABLE "users" ADD COLUMN "is_onboarding" BOOLEAN NOT NULL DEFAULT true;

UPDATE "users" SET "is_onboarding" = NOT "onboarding";

ALTER TABLE "users" DROP COLUMN "onboarding";
