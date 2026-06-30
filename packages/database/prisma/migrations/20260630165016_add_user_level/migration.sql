-- CreateTable
CREATE TABLE "UserLevel" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLevel_guildId_idx" ON "UserLevel"("guildId");

-- CreateIndex
CREATE INDEX "UserLevel_guildId_xp_idx" ON "UserLevel"("guildId", "xp");

-- CreateIndex
CREATE UNIQUE INDEX "UserLevel_guildId_userId_key" ON "UserLevel"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "UserLevel" ADD CONSTRAINT "UserLevel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
