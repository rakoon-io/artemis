-- CreateTable
CREATE TABLE "AiUsageDay" (
    "date" TEXT NOT NULL,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsageDay_pkey" PRIMARY KEY ("date")
);
