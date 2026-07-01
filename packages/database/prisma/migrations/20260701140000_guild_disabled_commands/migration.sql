-- AlterTable
ALTER TABLE "Guild" ADD COLUMN "disabledCommands" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
