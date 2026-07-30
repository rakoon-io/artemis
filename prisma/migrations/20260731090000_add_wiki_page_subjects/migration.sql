-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "WikiPageModule" (
    "pageId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,

    CONSTRAINT "WikiPageModule_pkey" PRIMARY KEY ("pageId","moduleId")
);

-- CreateTable
CREATE TABLE "WikiPageComponent" (
    "pageId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,

    CONSTRAINT "WikiPageComponent_pkey" PRIMARY KEY ("pageId","componentId")
);

-- CreateIndex
CREATE INDEX "WikiPageModule_moduleId_idx" ON "WikiPageModule"("moduleId");

-- CreateIndex
CREATE INDEX "WikiPageComponent_componentId_idx" ON "WikiPageComponent"("componentId");

-- AddForeignKey
ALTER TABLE "WikiPageModule" ADD CONSTRAINT "WikiPageModule_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageModule" ADD CONSTRAINT "WikiPageModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageComponent" ADD CONSTRAINT "WikiPageComponent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageComponent" ADD CONSTRAINT "WikiPageComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE CASCADE ON UPDATE CASCADE;

