-- CreateEnum
CREATE TYPE "BlacklistType" AS ENUM ('GUILD', 'USER');

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Blacklist_type_idx" ON "Blacklist"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_type_targetId_key" ON "Blacklist"("type", "targetId");
