"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import { createProjectSchema } from "@/lib/validators";
import { createProject } from "@/server/services/project.service";
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
    revalidatePath("/projects");
    return { ok: true, data: { id: project.id, key: project.key } };
  });
}
