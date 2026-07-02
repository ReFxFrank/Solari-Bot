-- CreateTable
CREATE TABLE "GuildInsightsDay" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "activeMembers" INTEGER NOT NULL DEFAULT 0,
    "joins" INTEGER NOT NULL DEFAULT 0,
    "leaves" INTEGER NOT NULL DEFAULT 0,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "topChannels" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildInsightsDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildInsightsDay_guildId_date_idx" ON "GuildInsightsDay"("guildId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInsightsDay_guildId_date_key" ON "GuildInsightsDay"("guildId", "date");

-- AddForeignKey
ALTER TABLE "GuildInsightsDay" ADD CONSTRAINT "GuildInsightsDay_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
