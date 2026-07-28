-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('PAGE', 'SHARED', 'SERVICE');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "componentId" TEXT;

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ComponentKind" NOT NULL DEFAULT 'PAGE',
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Component_projectId_idx" ON "Component"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Component_projectId_name_key" ON "Component"("projectId", "name");

-- CreateIndex
CREATE INDEX "Ticket_componentId_idx" ON "Ticket"("componentId");

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

