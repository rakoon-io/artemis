-- CreateEnum
CREATE TYPE "ReleaseState" AS ENUM ('PLANNED', 'RELEASED');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "releaseId" TEXT;

-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" "ReleaseState" NOT NULL DEFAULT 'PLANNED',
    "dueDate" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Release_projectId_idx" ON "Release"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Release_projectId_name_key" ON "Release"("projectId", "name");

-- CreateIndex
CREATE INDEX "Ticket_releaseId_idx" ON "Ticket"("releaseId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

