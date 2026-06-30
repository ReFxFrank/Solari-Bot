-- CreateTable
CREATE TABLE "StarboardMessage" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "sourceChannelId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "starboardMessageId" TEXT,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarboardMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StarboardMessage_guildId_idx" ON "StarboardMessage"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "StarboardMessage_guildId_sourceMessageId_key" ON "StarboardMessage"("guildId", "sourceMessageId");

-- AddForeignKey
ALTER TABLE "StarboardMessage" ADD CONSTRAINT "StarboardMessage_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
