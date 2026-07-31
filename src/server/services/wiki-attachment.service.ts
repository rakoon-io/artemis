import { prisma } from "@/lib/db";
import { forgetObjects } from "./stored-objects.service";

/**
 * Service Pièce jointe de PAGE DE WIKI - accès données pur (l'objet lui-même vit
 * dans le stockage ; seules les métadonnées sont ici).
 *
 * Volontairement distinct du service des pièces jointes de ticket : les deux ne
 * partagent ni la table, ni la garde d'accès - un ticket s'édite selon les
 * droits sur le ticket, une page de wiki selon l'accès au projet.
 */

export interface CreateWikiAttachmentInput {
  pageId: string;
  filename: string;
  contentType: string;
  size: number;
  storageKey: string;
  uploadedById: string;
}

export function createWikiAttachment(input: CreateWikiAttachmentInput) {
  return prisma.wikiAttachment.create({ data: input });
}

export function listWikiAttachments(pageId: string) {
  return prisma.wikiAttachment.findMany({
    where: { pageId },
    orderBy: { createdAt: "asc" },
    include: { uploadedBy: { select: { name: true, email: true } } },
  });
}

/** Pièce jointe + projet de la page porteuse, pour la garde d'accès. */
export function getWikiAttachmentWithProject(id: string) {
  return prisma.wikiAttachment.findUnique({
    where: { id },
    include: { page: { select: { projectId: true } } },
  });
}

/** Supprime la pièce jointe, ET l'objet qu'elle désigne (cf. `forgetObjects`). */
export async function deleteWikiAttachment(id: string) {
  const supprimee = await prisma.wikiAttachment.delete({ where: { id } });
  await forgetObjects([supprimee.storageKey]);
  return supprimee;
}
