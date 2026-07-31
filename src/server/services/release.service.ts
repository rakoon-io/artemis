import { prisma } from "@/lib/db";
import { ReleaseState } from "@prisma/client";
import { isReleaseLate } from "@/lib/release-progress";

/**
 * Service VERSION - accès données pur (`Release` en base, « version » à l'écran).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * VERSION N'EST PAS SPRINT
 *
 * Le sprint dit QUAND on travaille, la version dit CE QU'ON LIVRE. Les deux ne se
 * recouvrent pas : un correctif urgent sort entre deux itérations, une refonte
 * s'étale sur trois. C'est pourquoi un ticket porte les deux, indépendamment.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ORDRE EST CELUI DE LA LIVRAISON
 *
 * Les versions se lisent de la plus proche à la plus lointaine : ce qui n'est pas
 * encore livré d'abord - c'est là qu'on agit -, le livré ensuite, du plus récent
 * au plus ancien. Trier sur le NOM aurait rangé « 1.10 » avant « 1.9 », et trier
 * sur la date de création aurait ignoré qu'on planifie rarement dans l'ordre.
 */

/** Toutes les versions du projet, à livrer d'abord, puis les livrées. */
export function listReleases(projectId: string) {
  return prisma.release.findMany({
    where: { projectId },
    orderBy: [
      { state: "asc" }, // PLANNED avant RELEASED (ordre de l'enum)
      { dueDate: { sort: "asc", nulls: "last" } },
      { releasedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "asc" },
    ],
  });
}

/**
 * Idem, avec le contenu de chaque version et de quoi mesurer l'avancement.
 *
 * Le RETARD est tranché ici, à la lecture : c'est un fait de la donnée au moment
 * de la requête, pas un calcul de rendu. Le faire dans un composant reviendrait
 * à lire l'horloge pendant le rendu - impur, et différent d'un côté et de
 * l'autre de l'hydratation.
 */
export async function listReleasesWithTickets(projectId: string) {
  const rows = await prisma.release.findMany({
    where: { projectId },
    orderBy: [
      { state: "asc" },
      { dueDate: { sort: "asc", nulls: "last" } },
      { releasedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    include: {
      tickets: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          columnId: true,
          column: { select: { name: true, order: true } },
          type: { select: { name: true, color: true } },
          priority: { select: { name: true, color: true } },
          assignee: { select: { name: true, email: true } },
        },
      },
    },
  });
  const now = Date.now();
  return rows.map((release) => ({ ...release, late: isReleaseLate(release, now) }));
}

/** Projet d'une version (pour la garde d'accès des actions). */
export function getReleaseProjectId(id: string): Promise<string | null> {
  return prisma.release
    .findUnique({ where: { id }, select: { projectId: true } })
    .then((r) => r?.projectId ?? null);
}

export function createRelease(data: {
  projectId: string;
  name: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  return prisma.release.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      description: data.description ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
  });
}

export function updateRelease(data: {
  id: string;
  name?: string;
  description?: string | null;
  dueDate?: string | null;
}) {
  return prisma.release.update({
    where: { id: data.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.dueDate !== undefined
        ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
        : {}),
    },
  });
}

/**
 * Livre une version, ou la remet en préparation.
 *
 * La date de livraison est posée par le SERVEUR, jamais reçue : c'est un fait
 * constaté, pas une intention. Rouvrir une version l'efface - une version en
 * préparation qui garderait une date de livraison serait un mensonge.
 */
export function setReleaseState(id: string, released: boolean) {
  return prisma.release.update({
    where: { id },
    data: released
      ? { state: ReleaseState.RELEASED, releasedAt: new Date() }
      : { state: ReleaseState.PLANNED, releasedAt: null },
  });
}

/** Supprime une version. Les tickets qu'elle portait la perdent (`SetNull`). */
export function deleteRelease(id: string) {
  return prisma.release.delete({ where: { id } });
}
