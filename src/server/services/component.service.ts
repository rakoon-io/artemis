import { prisma } from "@/lib/db";
import { Prisma, ProposalStatus, type ComponentKind } from "@prisma/client";

/**
 * Service Composant applicatif - accès données pur (autorisation dans les actions).
 *
 * Un composant décrit une brique du produit suivi par le projet : une PAGE
 * (écran / route), un composant réutilisable (SHARED) ou un SERVICE technique.
 * Rattacher un ticket à un composant CONTEXTUALISE la demande : on sait de quelle
 * partie du produit elle parle. Le catalogue est configurable par projet (même
 * modèle que les types / priorités : `order` stable, unicité `(projectId, name)`),
 * avec en plus une `description` libre qui sert de contexte - affichée dans l'UI
 * et injectée dans le prompt de génération de tickets par l'IA.
 */

/**
 * Traduit la violation de `@@unique([projectId, name])` en message métier.
 * Sans cela, le texte brut de Prisma (« Unique constraint failed on the fields:
 * … ») remonterait tel quel dans le toast via `toErrorMessage`, alors que le cas
 * est banal : un administrateur ressaisit un nom déjà pris. Toute autre erreur
 * est relayée inchangée.
 */
function rethrowBusinessError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    throw new Error("Un composant portant ce nom existe déjà dans ce projet.");
  }
  throw error;
}

/** Module tel que rattaché à un composant (badge, regroupement, prompt IA). */
const moduleSelect = { select: { id: true, name: true, color: true } } as const;

/**
 * Catalogue de composants d'un projet, dans l'ordre défini par l'administrateur,
 * avec le module de rattachement éventuel. Le nom départage les `order` égaux :
 * deux créations concurrentes peuvent calculer le même rang (`max + 1`), et
 * l'ordre resterait sinon indéterminé d'une requête à l'autre - donc instable
 * dans les listes ET dans le prompt IA.
 */
export function listComponents(projectId: string) {
  return prisma.component.findMany({
    where: { projectId, status: ProposalStatus.APPROVED },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { module: moduleSelect },
  });
}

/** Propositions de composants en attente de validation, plus anciennes d'abord. */
export function listProposedComponents(projectId: string) {
  return prisma.component.findMany({
    where: { projectId, status: ProposalStatus.PROPOSED },
    orderBy: { createdAt: "asc" },
    include: {
      module: moduleSelect,
      proposedBy: { select: { name: true, email: true } },
    },
  });
}

/**
 * Enregistre une PROPOSITION de composant (rapporteur). Invisible des sélecteurs
 * et du contexte IA tant qu'un admin ne l'a pas validée.
 */
export async function proposeComponent(
  input: CreateComponentServiceInput & { proposedById: string },
) {
  const aggregate = await prisma.component.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const moduleId = await coherentModuleId(input.projectId, input.moduleId ?? null);
  try {
    return await prisma.component.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        kind: input.kind,
        moduleId: moduleId ?? null,
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

/** Valide une proposition : le composant devient utilisable partout. */
export function approveComponent(id: string) {
  return prisma.component.update({
    where: { id },
    data: { status: ProposalStatus.APPROVED, proposedById: null },
  });
}

/** Refuse une proposition : suppression (jamais référencée par un ticket). */
export function rejectComponent(id: string) {
  return prisma.component.deleteMany({
    where: { id, status: ProposalStatus.PROPOSED },
  });
}

/**
 * Vérifie qu'un module appartient bien au projet visé. Un composant rattaché au
 * module d'un AUTRE projet serait une incohérence silencieuse : on préfère
 * détacher (`null`) plutôt que d'enregistrer un rattachement absurde.
 */
async function coherentModuleId(
  projectId: string,
  moduleId: string | null | undefined,
): Promise<string | null | undefined> {
  if (moduleId === undefined || moduleId === null) return moduleId;
  const target = await prisma.module.findFirst({
    where: { id: moduleId, projectId },
    select: { id: true },
  });
  return target ? moduleId : null;
}

export interface CreateComponentServiceInput {
  projectId: string;
  name: string;
  kind: ComponentKind;
  /** Module de rattachement (facultatif) : `null` = composant transverse. */
  moduleId?: string | null;
  description?: string | null;
  color: string;
}

/** Crée un composant placé en fin de catalogue (order = max + 1). */
export async function createComponent(input: CreateComponentServiceInput) {
  const aggregate = await prisma.component.aggregate({
    where: { projectId: input.projectId },
    _max: { order: true },
  });
  const order = (aggregate._max.order ?? -1) + 1;
  const moduleId = await coherentModuleId(input.projectId, input.moduleId ?? null);
  try {
    return await prisma.component.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        kind: input.kind,
        moduleId: moduleId ?? null,
        description: input.description ?? null,
        color: input.color,
        order,
      },
    });
  } catch (error) {
    rethrowBusinessError(error);
  }
}

export interface UpdateComponentServiceInput {
  id: string;
  name?: string;
  kind?: ComponentKind;
  /** `undefined` = ne pas toucher ; `null` = détacher du module. */
  moduleId?: string | null;
  description?: string | null;
  color?: string;
}

export async function updateComponent(input: UpdateComponentServiceInput) {
  // Le rattachement se vérifie contre le projet du composant, pas contre celui
  // fourni par l'appelant : c'est la seule source fiable.
  let moduleId = input.moduleId;
  if (moduleId) {
    const existing = await prisma.component.findUnique({
      where: { id: input.id },
      select: { projectId: true },
    });
    if (!existing) throw new Error("Composant introuvable.");
    moduleId = await coherentModuleId(existing.projectId, moduleId);
  }

  try {
    return await prisma.component.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(moduleId !== undefined ? { moduleId } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
    });
  } catch (error) {
    // Renommer vers un nom déjà pris dans le projet est le même cas métier.
    rethrowBusinessError(error);
  }
}

/**
 * Supprime un composant ; refuse si au moins un ticket le référence (message
 * explicite), par parité avec les types / priorités. La contrainte de clé
 * étrangère est en `SetNull` : même si une suppression passait outre ce garde-fou,
 * aucun ticket ne serait perdu - il redeviendrait simplement sans composant.
 */
export async function deleteComponent(id: string) {
  const inUse = await prisma.ticket.count({ where: { componentId: id } });
  if (inUse > 0) {
    throw new Error(
      "Ce composant est référencé par des tickets et ne peut pas être supprimé.",
    );
  }
  return prisma.component.delete({ where: { id } });
}

/** Applique l'ordre donné : la position de chaque composant = son index dans `orderedIds`. */
export async function reorderComponents(projectId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, order) =>
      prisma.component.updateMany({
        where: { id, projectId },
        data: { order },
      }),
    ),
  );
  return listComponents(projectId);
}
