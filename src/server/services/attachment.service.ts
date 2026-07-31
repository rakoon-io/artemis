import { prisma } from "@/lib/db";
import { forgetObjects } from "./stored-objects.service";

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

/**
 * Supprime la pièce jointe, ET l'objet qu'elle désigne.
 *
 * `delete` rend la ligne effacée : sa clé de stockage est donc connue sans
 * requête supplémentaire, et connue APRÈS coup - donc forcément celle qui vient
 * de disparaître, et non celle qu'une modification concurrente aurait remplacée.
 */
export async function deleteAttachment(id: string) {
  const supprimee = await prisma.attachment.delete({ where: { id } });
  await forgetObjects([supprimee.storageKey]);
  return supprimee;
}
