-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PROPOSED', 'APPROVED');

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "proposedById" TEXT,
ADD COLUMN     "status" "ProposalStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Component" ADD COLUMN     "proposedById" TEXT,
ADD COLUMN     "status" "ProposalStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Module_projectId_status_idx" ON "Module"("projectId", "status");

-- CreateIndex
CREATE INDEX "Component_projectId_status_idx" ON "Component"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

