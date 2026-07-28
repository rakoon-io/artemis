-- AlterTable
ALTER TABLE "Component" ADD COLUMN     "moduleId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "moduleId" TEXT;

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Module_projectId_idx" ON "Module"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Module_projectId_name_key" ON "Module"("projectId", "name");

-- CreateIndex
CREATE INDEX "Component_moduleId_idx" ON "Component"("moduleId");

-- CreateIndex
CREATE INDEX "Ticket_moduleId_idx" ON "Ticket"("moduleId");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

