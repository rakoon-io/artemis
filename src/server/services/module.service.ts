import { prisma } from "@/lib/db";
import { Prisma, ProposalStatus } from "@prisma/client";

/**
 * Service Module fonctionnel - accès données pur (autorisation dans les actions).
 *
 * Un module est un ensemble de fonctionnalités à grosse maille (« Gestion des
 * utilisateurs »), au-dessus des composants. C'est de la STRUCTURE PRODUIT : il
 * ne se termine pas, contrairement à un sprint ou un lot. Même modèle de
 * configuration que les autres catalogues du projet (`order` stable, unicité
 * `(projectId, name)`), avec une `description` libre injectée dans le contexte IA.
 */

/** Traduit la violation de `@@unique([projectId, name])` en message métier. */
function rethrowBusinessError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("Un module portant ce nom existe déjà dans ce projet.");
  }
  throw error;
}

/**
 * Modules VALIDÉS d'un projet, ordonnés. Le nom départage les `order` égaux (deux
 * créations concurrentes peuvent calculer le même rang), pour que l'ordre reste
 * stable d'une requête à l'autre - listes comme prompt IA.
 *
 * Le filtre sur `APPROVED` est le DÉFAUT, volontairement : tous les appelants
 * existants (sélecteurs de ticket, contexte IA, serveur MCP) excluent ainsi les
 * propositions sans avoir à y penser. Seules les vues de validation demandent
 * explicitement à les voir.
 */
export function listModules(projectId: string) {
  return prisma.module.findMany({
    where: { projectId, status: ProposalStatus.APPROVED },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
}

/** Propositions de modules en attente de validation, plus anciennes d'abord. */
export function listProposedModules(projectId: string) {
  return prisma.module.findMany({
    where: { projectId, status: ProposalStatus.PROPOSED },
    orderBy: { createdAt: "asc" },
    include: { proposedBy: { select: { name: true, email: true } } },
  });
}

/**
 * Enregistre une PROPOSITION de module (rapporteur). Elle est placée en fin de
 * liste et reste invisible des sélecteurs tant qu'un admin ne l'a pas validée.
 */
export async function proposeModule(
  input: CreateModuleServiceInput & { proposedById: string },
) {
  const aggregate = await prisma.module.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  try {
    return await prisma.module.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        order: (aggregate._max.order ?? -1) + 1,
        status: ProposalStatus.PROPOSED,
        proposedById: input.proposedById,
      },
    });
  } catch (error) {
    rethrowBusinessError(error);
  }
}

/** Valide une proposition : le module devient utilisable partout. */
export function approveModule(id: string) {
  return prisma.module.update({
    where: { id },
    data: { status: ProposalStatus.APPROVED, proposedById: null },
  });
}

/**
 * Refuse une proposition : on la supprime. N'étant jamais sélectionnable avant
 * validation, elle n'est référencée par aucun ticket - aucun orphelin possible.
 */
export function rejectModule(id: string) {
  return prisma.module.deleteMany({
    where: { id, status: ProposalStatus.PROPOSED },
  });
}

/**
 * Modules avec leurs composants, pour les vues à deux niveaux (réglages, et
 * assemblage du contexte transmis à l'IA).
 */
export function listModulesWithComponents(projectId: string) {
  return prisma.module.findMany({
    where: { projectId, status: ProposalStatus.APPROVED },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: {
      components: {
        where: { status: ProposalStatus.APPROVED },
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, kind: true, description: true, color: true },
      },
    },
  });
}

export interface CreateModuleServiceInput {
  projectId: string;
  name: string;
  description?: string | null;
  color: string;
}

/** Crée un module placé en fin de liste (order = max + 1). */
export async function createModule(input: CreateModuleServiceInput) {
  const aggregate = await prisma.module.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const order = (aggregate._max.order ?? -1) + 1;
  try {
    return await prisma.module.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        description: input.description ?? null,
        color: input.color,
        order,
      },
    });
  } catch (error) {
    rethrowBusinessError(error);
  }
}

export interface UpdateModuleServiceInput {
  id: string;
  name?: string;
  description?: string | null;
  color?: string;
}

export async function updateModule(input: UpdateModuleServiceInput) {
  try {
    return await prisma.module.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  } catch (error) {
    rethrowBusinessError(error);
  }
}

/**
 * Supprime un module ; refuse s'il regroupe encore des composants ou des tickets,
 * pour que la suppression soit un geste explicite et non un détachement silencieux.
 * Les clés étrangères sont en `SetNull` : même si une suppression passait outre ce
 * garde-fou, ni composant ni ticket ne serait perdu - ils redeviendraient
 * simplement sans module.
 */
export async function deleteModule(id: string) {
  const [components, tickets] = await Promise.all([
    prisma.component.count({ where: { moduleId: id } }),
    prisma.ticket.count({ where: { moduleId: id } }),
  ]);
  if (components > 0 || tickets > 0) {
    throw new Error(
      "Ce module regroupe encore des composants ou des tickets et ne peut pas être supprimé.",
    );
  }
  return prisma.module.delete({ where: { id } });
}

/** Applique l'ordre donné : la position de chaque module = son index dans `orderedIds`. */
export async function reorderModules(projectId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.module.updateMany({
        where: { id, projectId },
        data: { order },
      }),
    ),
  );
  return listModules(projectId);
}
