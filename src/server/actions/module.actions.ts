"use server";

import type { z } from "zod";
import { assert, can, canProposeTaxonomy, isAdmin } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import {
  createModuleSchema,
  reorderModulesSchema,
  updateModuleSchema,
} from "@/lib/validators";
import {
  approveModule,
  createModule,
  deleteModule,
  proposeModule,
  rejectModule,
  reorderModules,
  updateModule,
} from "@/server/services/module.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions des modules fonctionnels d'un projet (ensembles de fonctionnalités à
 * grosse maille, au-dessus des composants). Gestion réservée à l'Admin, comme
 * les autres briques de personnalisation. « L'UI masque, le serveur impose. »
 */

const FORBIDDEN = "Gestion des modules réservée aux administrateurs.";

/** Crée un module (placé en fin de liste). Réservé à l'Admin. */
export async function createModuleAction(
  input: z.input<typeof createModuleSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = createModuleSchema.parse(input);
    const created = await createModule(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: created.id } };
  });
}

/** Met à jour un module (nom, description, couleur). Réservé à l'Admin. */
export async function updateModuleAction(
  input: z.input<typeof updateModuleSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = updateModuleSchema.parse(input);
    const updated = await updateModule(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: updated.id } };
  });
}

/** Réordonne les modules (ordre = position dans `orderedIds`). Réservé à l'Admin. */
export async function reorderModulesAction(
  input: z.input<typeof reorderModulesSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = reorderModulesSchema.parse(input);
    await reorderModules(data.projectId, data.orderedIds);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Supprime un module. Refusé s'il regroupe encore des composants ou tickets. Admin. */
export async function deleteModuleAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    try {
      await deleteModule(id);
    } catch (error) {
      // Module « encore utilisé » → message métier, pas d'exception vers le client.
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Suppression impossible.",
      };
    }
    revalidateBoardAndList();
    return { ok: true };
  });
}

/**
 * PROPOSE un module (rapporteur). Contrairement aux actions ci-dessus, elle est
 * ouverte à tout membre du projet - d'où la vérification d'accès au projet, que
 * les actions réservées à l'admin n'ont pas besoin de faire (un administrateur
 * accède à tous les projets).
 *
 * La proposition reste invisible des sélecteurs, de l'IA et du MCP tant qu'un
 * administrateur ne l'a pas validée.
 */
export async function proposeModuleAction(
  input: z.input<typeof createModuleSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(canProposeTaxonomy(user), "Vous devez être connecté pour proposer un module.");
    const data = createModuleSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const created = await proposeModule({ ...data, proposedById: user.id });
    revalidateBoardAndList();
    return { ok: true, data: { id: created.id } };
  });
}

/** Valide une proposition de module. Réservé à l'Admin. */
export async function approveModuleAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "review_proposals"), FORBIDDEN);
    await approveModule(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Refuse (et supprime) une proposition de module. Réservé à l'Admin. */
export async function rejectModuleAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "review_proposals"), FORBIDDEN);
    await rejectModule(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
