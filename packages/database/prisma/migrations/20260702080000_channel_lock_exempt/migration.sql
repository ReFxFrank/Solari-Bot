-- AlterTable
-- Per-role prior SendMessages state for lockdown-exempt roles, so unlock can
-- restore each exempt role to exactly what it was before the lock.
ALTER TABLE "ChannelLock" ADD COLUMN "exemptStates" JSONB NOT NULL DEFAULT '[]';
