-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "WikiPageSlug" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiPageSlug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WikiPageSlug_pageId_idx" ON "WikiPageSlug"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPageSlug_projectId_slug_key" ON "WikiPageSlug"("projectId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WikiPage_projectId_slug_key" ON "WikiPage"("projectId", "slug");

-- AddForeignKey
ALTER TABLE "WikiPageSlug" ADD CONSTRAINT "WikiPageSlug_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiPageSlug" ADD CONSTRAINT "WikiPageSlug_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

