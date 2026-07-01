-- CreateTable
CREATE TABLE "EconomyUser" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wallet" INTEGER NOT NULL DEFAULT 0,
    "bank" INTEGER NOT NULL DEFAULT 0,
    "lastDaily" TIMESTAMP(3),
    "lastWork" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomyUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EconomyUser_guildId_idx" ON "EconomyUser"("guildId");

-- CreateIndex
CREATE INDEX "EconomyUser_guildId_wallet_idx" ON "EconomyUser"("guildId", "wallet");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyUser_guildId_userId_key" ON "EconomyUser"("guildId", "userId");

-- AddForeignKey
ALTER TABLE "EconomyUser" ADD CONSTRAINT "EconomyUser_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
