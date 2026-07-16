-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "WikiPage_parentId_idx" ON "WikiPage"("parentId");

-- AddForeignKey
ALTER TABLE "WikiPage" ADD CONSTRAINT "WikiPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
