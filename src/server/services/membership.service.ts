import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Service Appartenance projet - accès données pur (aucune autorisation ici).
 * Une ligne accorde l'accès d'un Rapporteur à un projet. Les administrateurs
 * accèdent à tous les projets sans ligne (voir `src/server/access.ts`).
 */

/** Identifiants des membres (utilisateurs) d'un projet. */
export function listProjectMemberIds(projectId: string): Promise<string[]> {
  return prisma.projectMember
    .findMany({ where: { projectId }, select: { userId: true } })
    .then((rows) => rows.map((r) => r.userId));
}

/** Vrai si l'utilisateur est membre du projet. */
export function isProjectMember(
  projectId: string,
  userId: string,
): Promise<boolean> {
  return prisma.projectMember
    .findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { projectId: true },
    })
    .then(Boolean);
}

/** Identifiants des projets auxquels l'utilisateur a explicitement accès. */
export function listAccessibleProjectIds(userId: string): Promise<string[]> {
  return prisma.projectMember
    .findMany({ where: { userId }, select: { projectId: true } })
    .then((rows) => rows.map((r) => r.projectId));
}

/** Ajoute un membre (idempotent). */
export function addProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: {},
    create: { projectId, userId },
  });
}

/** Retire un membre (sans erreur s'il ne l'était pas). */
export function removeProjectMember(projectId: string, userId: string) {
  return prisma.projectMember.deleteMany({ where: { projectId, userId } });
}

/**
 * Utilisateurs pouvant être assignés dans ce projet : ceux qui y ont accès,
 * c'est-à-dire les administrateurs (accès à tout) et les membres du projet.
 */
export function listAssignableUsers(projectId: string) {
  return prisma.user.findMany({
    where: {
      OR: [{ role: Role.ADMIN }, { memberships: { some: { projectId } } }],
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Tous les utilisateurs avec un indicateur `isMember` pour ce projet (vue de
 * gestion des membres). Les administrateurs accèdent de toute façon à tout.
 */
export async function listProjectMembersView(projectId: string) {
  const [users, memberIds] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
    listProjectMemberIds(projectId),
  ]);
  const members = new Set(memberIds);
  return users.map((u) => ({ ...u, isMember: members.has(u.id) }));
}
