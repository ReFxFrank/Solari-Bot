-- AlterTable: add per-tier tracking to unlocked achievements
ALTER TABLE "UserAchievement" ADD COLUMN "tier" INTEGER NOT NULL DEFAULT 0;

-- Replace the (guild,user,achievement) unique with one that includes the tier
DROP INDEX "UserAchievement_guildId_userId_achievementId_key";
CREATE UNIQUE INDEX "UserAchievement_guildId_userId_achievementId_tier_key" ON "UserAchievement"("guildId", "userId", "achievementId", "tier");
