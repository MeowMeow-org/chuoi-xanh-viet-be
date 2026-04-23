-- Gộp reject_reason + approval_note (nếu có) thành một cột reviewer_note

ALTER TABLE "farm_certificates" ADD COLUMN "reviewer_note" VARCHAR(500);

UPDATE "farm_certificates"
SET "reviewer_note" = LEFT(TRIM(BOTH FROM "reject_reason"), 500)
WHERE "reject_reason" IS NOT NULL AND TRIM(BOTH FROM "reject_reason") <> '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'farm_certificates'
      AND column_name = 'approval_note'
  ) THEN
    UPDATE "farm_certificates"
    SET "reviewer_note" = LEFT(TRIM(BOTH FROM "approval_note"), 500)
    WHERE (
        "reviewer_note" IS NULL
        OR TRIM(BOTH FROM COALESCE("reviewer_note", '')) = ''
      )
      AND "approval_note" IS NOT NULL
      AND TRIM(BOTH FROM "approval_note") <> '';
  END IF;
END $$;

ALTER TABLE "farm_certificates" DROP COLUMN IF EXISTS "approval_note";
ALTER TABLE "farm_certificates" DROP COLUMN "reject_reason";
