-- CreateIndex
CREATE INDEX "Attachment_createdAt_idx" ON "Attachment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_ticketId_createdAt_idx" ON "Comment"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_projectId_createdAt_idx" ON "Ticket"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketLink_createdAt_idx" ON "TicketLink"("createdAt");

-- CreateIndex
CREATE INDEX "WikiRevision_createdAt_idx" ON "WikiRevision"("createdAt");
