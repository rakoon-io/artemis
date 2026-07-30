-- CreateEnum
CREATE TYPE "WikiSectionKind" AS ENUM ('SPEC', 'MEETING', 'IMPLEMENTATION');

-- CreateTable
CREATE TABLE "WikiSection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "WikiSectionKind" NOT NULL,
    "rootPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WikiSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikiSection_rootPageId_key" ON "WikiSection"("rootPageId");

-- CreateIndex
CREATE INDEX "WikiSection_projectId_idx" ON "WikiSection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiSection_projectId_kind_key" ON "WikiSection"("projectId", "kind");

-- AddForeignKey
ALTER TABLE "WikiSection" ADD CONSTRAINT "WikiSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiSection" ADD CONSTRAINT "WikiSection_rootPageId_fkey" FOREIGN KEY ("rootPageId") REFERENCES "WikiPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

