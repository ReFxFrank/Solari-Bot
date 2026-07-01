-- CreateTable
CREATE TABLE "SocialSubscription" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "mentionRoleId" TEXT,
    "lastItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SocialSubscription_guildId_idx" ON "SocialSubscription"("guildId");

-- AddForeignKey
ALTER TABLE "SocialSubscription" ADD CONSTRAINT "SocialSubscription_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
