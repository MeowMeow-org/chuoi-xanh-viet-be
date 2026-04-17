-- Add `inspection` value to diary_event_type enum
-- Note: must run outside any transaction in Postgres; keep this migration
-- file limited to a single ALTER TYPE statement so Prisma executes it alone.
ALTER TYPE "diary_event_type" ADD VALUE IF NOT EXISTS 'inspection' BEFORE 'other';
