"use server";

import { z } from "zod";
import { SprintState } from "@prisma/client";
import { assertProjectAccess } from "@/server/access";
import { createSprintSchema, updateSprintSchema } from "@/lib/validators";
import {
  createSprint,
  deleteSprint,
  getSprintProjectId,
  setSprintState,
  updateSprint,
} from "@/server/services/sprint.service";
import { revalidateBoardAndList, withUser, type SessionUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions Sprint. Ouvertes à tout membre du projet (comme la création de ticket) :
 * planifier des sprints/lots fait partie du travail courant, pas de la config admin.
 * L'accès au projet est imposé côté serveur.
 */

/** Garde : l'utilisateur doit avoir accès au projet du sprint. Renvoie le projectId. */
async function assertSprintAccess(
  user: SessionUser,
  sprintId: string,
): Promise<string | null> {
  const projectId = await getSprintProjectId(sprintId);
  if (!projectId) return null;
  await assertProjectAccess(user, projectId);
  return projectId;
}

/** Crée un sprint dans un projet accessible à l'utilisateur. */
export async function createSprintAction(
  input: z.input<typeof createSprintSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = createSprintSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const sprint = await createSprint(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/**
 * Met à jour un sprint : nom, objectif et/ou dates. PARTIEL - un champ absent
 * reste inchangé, ce qui permet à l'édition en place de n'envoyer que le champ
 * touché plutôt que de réémettre tout le sprint (et d'écraser au passage ce qu'un
 * autre aurait modifié entre-temps).
 *
 * L'état n'est pas modifiable ici : il a son action dédiée, `setSprintStateAction`.
 */
export async function updateSprintAction(
  input: z.input<typeof updateSprintSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateSprintSchema.parse(input);
    if (!(await assertSprintAccess(user, data.id))) {
      return { ok: false, error: "Sprint introuvable." };
    }
    const sprint = await updateSprint(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/** Change l'état d'un sprint (PLANNED / ACTIVE / COMPLETED). */
export async function setSprintStateAction(
  id: string,
  state: SprintState,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    if (!(await assertSprintAccess(user, id))) {
      return { ok: false, error: "Sprint introuvable." };
    }
    const value = z.nativeEnum(SprintState).parse(state);
    const sprint = await setSprintState(id, value);
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/** Supprime un sprint (ses tickets sont détachés, pas supprimés). */
export async function deleteSprintAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    if (!(await assertSprintAccess(user, id))) {
      return { ok: false, error: "Sprint introuvable." };
    }
    await deleteSprint(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
