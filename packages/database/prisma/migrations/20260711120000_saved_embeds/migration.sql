-- CreateTable
CREATE TABLE "SavedEmbed" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT,
    "spec" JSONB NOT NULL,
    "channelId" TEXT,
    "messageId" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedEmbed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedEmbed_guildId_name_key" ON "SavedEmbed"("guildId", "name");

-- CreateIndex
CREATE INDEX "SavedEmbed_guildId_idx" ON "SavedEmbed"("guildId");

-- AddForeignKey
ALTER TABLE "SavedEmbed" ADD CONSTRAINT "SavedEmbed_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
