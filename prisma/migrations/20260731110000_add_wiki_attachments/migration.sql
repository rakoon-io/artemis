-- CreateTable
CREATE TABLE "WikiAttachment" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WikiAttachment_pageId_idx" ON "WikiAttachment"("pageId");

-- AddForeignKey
ALTER TABLE "WikiAttachment" ADD CONSTRAINT "WikiAttachment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiAttachment" ADD CONSTRAINT "WikiAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

