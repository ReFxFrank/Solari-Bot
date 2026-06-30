-- CreateEnum
CREATE TYPE "RolePanelMode" AS ENUM ('NORMAL', 'UNIQUE', 'VERIFY');

-- CreateEnum
CREATE TYPE "RolePanelType" AS ENUM ('BUTTON', 'SELECT');

-- CreateTable
CREATE TABLE "ReactionRolePanel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mode" "RolePanelMode" NOT NULL DEFAULT 'NORMAL',
    "type" "RolePanelType" NOT NULL DEFAULT 'BUTTON',
    "options" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReactionRolePanel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReactionRolePanel_guildId_idx" ON "ReactionRolePanel"("guildId");

-- CreateIndex
CREATE INDEX "ReactionRolePanel_messageId_idx" ON "ReactionRolePanel"("messageId");

-- AddForeignKey
ALTER TABLE "ReactionRolePanel" ADD CONSTRAINT "ReactionRolePanel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
