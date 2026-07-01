-- CreateTable
CREATE TABLE "MemberStat" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionsAdded" INTEGER NOT NULL DEFAULT 0,
    "threadsCreated" INTEGER NOT NULL DEFAULT 0,
    "threadsJoined" INTEGER NOT NULL DEFAULT 0,
    "invites" INTEGER NOT NULL DEFAULT 0,
    "giveawaysJoined" INTEGER NOT NULL DEFAULT 0,
    "itemsPurchased" INTEGER NOT NULL DEFAULT 0,
    "boosted" INTEGER NOT NULL DEFAULT 0,
    "birthdaySet" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberStat_guildId_idx" ON "MemberStat"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberStat_guildId_userId_key" ON "MemberStat"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "MemberStat" ADD CONSTRAINT "MemberStat_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
