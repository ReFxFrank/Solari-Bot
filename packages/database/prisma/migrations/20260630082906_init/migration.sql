-- CreateEnum
CREATE TYPE "Module" AS ENUM ('MODERATION', 'AUTOMOD', 'LOGGING', 'WELCOME', 'AUTOROLE', 'LEVELING', 'ROLES', 'CUSTOM_COMMANDS', 'STARBOARD', 'GIVEAWAYS', 'POLLS', 'SUGGESTIONS', 'REMINDERS', 'SCHEDULED_MESSAGES', 'TICKETS', 'STATS_COUNTERS', 'INVITE_TRACKING', 'BIRTHDAYS', 'AFK', 'ECONOMY', 'MUSIC', 'SOCIAL', 'TEMP_VOICE', 'UTILITY', 'FUN');

-- CreateEnum
CREATE TYPE "PremiumTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "icon" TEXT,
    "ownerId" TEXT,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "premiumTier" "PremiumTier" NOT NULL DEFAULT 'FREE',
    "featureFlags" JSONB NOT NULL DEFAULT '{}',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "prefix" TEXT NOT NULL DEFAULT '!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildModuleConfig" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "module" "Module" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildModuleConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardAuditLog" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "module" "Module",
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DashboardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Guild_ownerId_idx" ON "Guild"("ownerId");

-- CreateIndex
CREATE INDEX "GuildModuleConfig_guildId_idx" ON "GuildModuleConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildModuleConfig_guildId_module_key" ON "GuildModuleConfig"("guildId", "module");

-- CreateIndex
CREATE INDEX "DashboardAuditLog_guildId_idx" ON "DashboardAuditLog"("guildId");

-- CreateIndex
CREATE INDEX "DashboardAuditLog_guildId_createdAt_idx" ON "DashboardAuditLog"("guildId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuildModuleConfig" ADD CONSTRAINT "GuildModuleConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardAuditLog" ADD CONSTRAINT "DashboardAuditLog_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
