-- CreateTable
CREATE TABLE "GlobalModuleFlag" (
    "module" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalModuleFlag_pkey" PRIMARY KEY ("module")
);
