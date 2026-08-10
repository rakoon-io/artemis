"use server";

import type { z } from "zod";
import { assertProjectAccess } from "@/server/access";
import { createReleaseSchema, updateReleaseSchema } from "@/lib/validators";
import {
  createRelease,
  deleteRelease,
  getReleaseProjectId,
  setReleaseState,
  updateRelease,
} from "@/server/services/release.service";
import {
  getSprintScope,
  setSprintRelease,
} from "@/server/services/sprint.service";
import { sprintAssignable } from "@/lib/release-scope";
import { revalidateBoardAndList, withUser, type SessionUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions VERSION (« Release » en base).
 *
 * Ouvertes à tout membre du projet, comme les sprints : décider de ce qu'on
 * livre et quand fait partie du travail courant, pas de la configuration. L'accès
 * au projet, lui, est imposé côté serveur - « l'UI masque, le serveur impose ».
 */

/** Garde : l'utilisateur doit avoir accès au projet de la version. */
async function assertReleaseAccess(
  user: SessionUser,
  releaseId: string,
): Promise<string | null> {
  const projectId = await getReleaseProjectId(releaseId);
  if (!projectId) return null;
  await assertProjectAccess(user, projectId);
  return projectId;
}

export async function createReleaseAction(
  input: z.input<typeof createReleaseSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = createReleaseSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const release = await createRelease(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: release.id } };
  });
}

export async function updateReleaseAction(
  input: z.input<typeof updateReleaseSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateReleaseSchema.parse(input);
    const projectId = await assertReleaseAccess(user, data.id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await updateRelease(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: data.id } };
  });
}

/** Livre une version, ou la remet en préparation. */
export async function setReleaseStateAction(
  id: string,
  released: boolean,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const projectId = await assertReleaseAccess(user, id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await setReleaseState(id, released);
    revalidateBoardAndList();
    return { ok: true, data: { id } };
  });
}

/** Supprime une version. Les tickets qu'elle portait la perdent, sans disparaître. */
export async function deleteReleaseAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const projectId = await assertReleaseAccess(user, id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await deleteRelease(id);
    revalidateBoardAndList();
    return { ok: true, data: { id } };
  });
}

/**
 * RATTACHE UN SPRINT À UNE VERSION, ou l'en détache (`releaseId` nul).
 *
 * Ce que cela déplace : rien. L'appartenance des tickets se DÉDUIT du lien (cf.
 * `@/lib/release-scope`), si bien que rattacher puis détacher rend la version à
 * son état d'avant. Une recopie des `releaseId` aurait, elle, laissé des traces
 * qu'il aurait fallu défaire à la main.
 *
 * Deux refus, portés par le serveur :
 * - le sprint et la version doivent appartenir au MÊME projet, sans quoi une
 *   version afficherait le travail d'un projet auquel son lecteur n'a pas accès ;
 * - un sprint déjà rattaché AILLEURS n'est pas volé en silence : on le détache
 *   d'abord, ce qui est un geste conscient (cf. `sprintAssignable`).
 */
export async function setSprintReleaseAction(
  sprintId: string,
  releaseId: string | null,
): Promise<ActionResult> {
  return withUser(async (user) => {
    const sprint = await getSprintScope(sprintId);
    if (!sprint) return { ok: false, error: "Sprint introuvable." };
    await assertProjectAccess(user, sprint.projectId);

    if (releaseId) {
      const projectId = await assertReleaseAccess(user, releaseId);
      if (!projectId) return { ok: false, error: "Version introuvable." };
      if (projectId !== sprint.projectId) {
        return {
          ok: false,
          error: "Le sprint et la version doivent appartenir au même projet.",
        };
      }
      if (!sprintAssignable(sprint, releaseId)) {
        return {
          ok: false,
          error:
            "Ce sprint sort déjà dans une autre version. Détachez-le d'abord.",
        };
      }
    }

    await setSprintRelease(sprintId, releaseId);
    revalidateBoardAndList();
    return { ok: true, data: undefined };
  });
}
