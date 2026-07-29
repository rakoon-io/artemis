"use server";

import type { z } from "zod";
import { assert, can, canProposeTaxonomy, isAdmin } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import {
  createComponentSchema,
  reorderComponentsSchema,
  updateComponentSchema,
} from "@/lib/validators";
import {
  approveComponent,
  createComponent,
  deleteComponent,
  proposeComponent,
  rejectComponent,
  reorderComponents,
  updateComponent,
} from "@/server/services/component.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions du catalogue de composants d'un projet (page / composant réutilisable
 * / service). Gestion réservée à l'Admin, comme les autres briques de
 * personnalisation du projet. « L'UI masque, le serveur impose. »
 */

const FORBIDDEN = "Gestion des composants réservée aux administrateurs.";

/** Crée un composant (placé en fin de catalogue). Réservé à l'Admin. */
export async function createComponentAction(
  input: z.input<typeof createComponentSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = createComponentSchema.parse(input);
    const component = await createComponent({
      ...data,
      moduleId: data.moduleId ?? null,
    });
    revalidateBoardAndList();
    return { ok: true, data: { id: component.id } };
  });
}

/** Met à jour un composant (nom, nature, description, couleur). Réservé à l'Admin. */
export async function updateComponentAction(
  input: z.input<typeof updateComponentSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = updateComponentSchema.parse(input);
    const component = await updateComponent(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: component.id } };
  });
}

/** Réordonne le catalogue (ordre = position dans `orderedIds`). Réservé à l'Admin. */
export async function reorderComponentsAction(
  input: z.input<typeof reorderComponentsSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = reorderComponentsSchema.parse(input);
    await reorderComponents(data.projectId, data.orderedIds);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Supprime un composant. Refusé (message explicite) si des tickets le référencent. Admin. */
export async function deleteComponentAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    try {
      await deleteComponent(id);
    } catch (error) {
      // Composant « en cours d'utilisation » → message métier, pas d'exception client.
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
 * PROPOSE un composant (rapporteur). Ouverte à tout membre du projet, d'où la
 * vérification d'accès ; la proposition n'est utilisable qu'une fois validée.
 */
export async function proposeComponentAction(
  input: z.input<typeof createComponentSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(
      canProposeTaxonomy(user),
      "Vous devez être connecté pour proposer un composant.",
    );
    const data = createComponentSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const created = await proposeComponent({
      ...data,
      moduleId: data.moduleId ?? null,
      proposedById: user.id,
    });
    revalidateBoardAndList();
    return { ok: true, data: { id: created.id } };
  });
}

/** Valide une proposition de composant. Réservé à l'Admin. */
export async function approveComponentAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "review_proposals"), FORBIDDEN);
    await approveComponent(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Refuse (et supprime) une proposition de composant. Réservé à l'Admin. */
export async function rejectComponentAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "review_proposals"), FORBIDDEN);
    await rejectComponent(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
