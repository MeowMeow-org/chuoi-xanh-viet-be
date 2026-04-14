-- AlterEnum: add season workflow states
ALTER TYPE "season_status" ADD VALUE 'ready_to_anchor';
ALTER TYPE "season_status" ADD VALUE 'amended';
