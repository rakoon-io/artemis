-- CreateTable
CREATE TABLE "WikiRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecPackage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "rootPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecVersion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "publishedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpecPageSnapshot" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "pageId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SpecPageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WikiRevision_pageId_createdAt_idx" ON "WikiRevision"("pageId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpecPackage_rootPageId_key" ON "SpecPackage"("rootPageId");

-- CreateIndex
CREATE INDEX "SpecPackage_projectId_idx" ON "SpecPackage"("projectId");

-- CreateIndex
CREATE INDEX "SpecVersion_packageId_idx" ON "SpecVersion"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "SpecVersion_packageId_number_key" ON "SpecVersion"("packageId", "number");

-- CreateIndex
CREATE INDEX "SpecPageSnapshot_versionId_order_idx" ON "SpecPageSnapshot"("versionId", "order");

-- AddForeignKey
ALTER TABLE "WikiRevision" ADD CONSTRAINT "WikiRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiRevision" ADD CONSTRAINT "WikiRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecPackage" ADD CONSTRAINT "SpecPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecPackage" ADD CONSTRAINT "SpecPackage_rootPageId_fkey" FOREIGN KEY ("rootPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecVersion" ADD CONSTRAINT "SpecVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "SpecPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecVersion" ADD CONSTRAINT "SpecVersion_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecPageSnapshot" ADD CONSTRAINT "SpecPageSnapshot_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SpecVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpecPageSnapshot" ADD CONSTRAINT "SpecPageSnapshot_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

