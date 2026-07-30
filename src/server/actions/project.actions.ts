"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import { createProjectSchema, updateProjectSchema } from "@/lib/validators";
import { createProject, updateProject } from "@/server/services/project.service";
import { ensureWikiSections } from "@/server/services/wiki.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Crée un projet (+ ses 5 colonnes par défaut). Réservé à l'Admin. */
export async function createProjectAction(
  input: z.input<typeof createProjectSchema>,
): Promise<ActionResult<{ id: string; key: string }>> {
  return withUser<{ id: string; key: string }>(async (user) => {
    assert(isAdmin(user), "Création de projet réservée aux administrateurs.");
    const data = createProjectSchema.parse(input);
    const project = await createProject(data);
    // Les trois sections du wiki naissent AVEC le projet : un wiki qui commence
    // vide se remplit dans le desordre, et l'on ne range jamais apres coup.
    // Orchestre ici plutot que dans `createProject` : c'est l'action qui connait
    // l'auteur, et c'est elle qui compose les services.
    await ensureWikiSections(project.id, user.id);
    revalidatePath("/projects");
    return { ok: true, data: { id: project.id, key: project.key } };
  });
}

/** Met à jour le nom / la description d'un projet. Réservé à l'Admin. */
export async function updateProjectAction(
  input: z.input<typeof updateProjectSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), "Réservé aux administrateurs.");
    const data = updateProjectSchema.parse(input);
    const project = await updateProject(data.id, {
      name: data.name,
      description: data.description,
      accentColor: data.accentColor,
    });
    // Le renommage impacte la liste et les pages du projet (board, settings…).
    revalidatePath("/projects", "layout");
    return { ok: true, data: { id: project.id } };
  });
}
