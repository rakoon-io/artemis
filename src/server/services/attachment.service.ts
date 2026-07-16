import { prisma } from "@/lib/db";

/** Service Pièce jointe - accès données pur (métadonnées ; l'objet vit dans S3). */

export interface CreateAttachmentServiceInput {
  ticketId: string;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  uploadedById: string;
}

export function createAttachment(input: CreateAttachmentServiceInput) {
  return prisma.attachment.create({
    data: {
      ticketId: input.ticketId,
      filename: input.filename,
      contentType: input.contentType,
      size: input.size,
      storageKey: input.storageKey,
      uploadedById: input.uploadedById,
    },
  });
}

export function listAttachments(ticketId: string) {
  return prisma.attachment.findMany({
    where: { ticketId },
    orderBy: { createdAt: "asc" },
  });
}

export function getAttachment(id: string) {
  return prisma.attachment.findUnique({ where: { id } });
}

/** Pièce jointe + projet du ticket porteur (pour la garde d'accès au téléchargement). */
export function getAttachmentWithProject(id: string) {
  return prisma.attachment.findUnique({
    where: { id },
    include: { ticket: { select: { projectId: true } } },
  });
}

export function deleteAttachment(id: string) {
  return prisma.attachment.delete({ where: { id } });
}
