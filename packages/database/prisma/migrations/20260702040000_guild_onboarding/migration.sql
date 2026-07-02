-- Onboarding flags: welcome-message idempotency + dashboard quick-setup gating.
ALTER TABLE "Guild" ADD COLUMN "onboardedAt" TIMESTAMP(3);
ALTER TABLE "Guild" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);

-- Existing guilds are already configured by their owners: mark them onboarded
-- and set-up so the new welcome message and quick-setup wizard only target
-- servers that add Solari from here on (no retroactive DMs, no wizard nag).
UPDATE "Guild" SET "onboardedAt" = now(), "setupCompletedAt" = now();
