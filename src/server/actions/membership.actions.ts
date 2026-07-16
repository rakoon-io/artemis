"use server";

import { revalidatePath } from "next/cache";
import { assert, can } from "@/lib/policies";
import { projectMemberSchema } from "@/lib/validators";
import {
  addProjectMember,
  removeProjectMember,
} from "@/server/services/membership.service";
import { getUserById } from "@/server/services/user.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions d'appartenance projet. Réservées à l'Admin (`manage_members`). Elles
 * accordent ou retirent l'accès d'un Rapporteur à un projet ; les administrateurs
 * accèdent de toute façon à tout, il est donc inutile de les ajouter.
 */

/** Revalide les vues dépendant de l'accès (liste des projets, pages du projet). */
function revalidateAccess(): void {
  revalidatePath("/projects", "layout");
}

/** Ajoute un membre au projet (idempotent). */
export async function addProjectMemberAction(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(
      can(user, "manage_members"),
      "Gestion des membres réservée aux administrateurs.",
    );
    const data = projectMemberSchema.parse({ projectId, userId });
    const target = await getUserById(data.userId);
    if (!target) return { ok: false, error: "Utilisateur introuvable." };
    await addProjectMember(data.projectId, data.userId);
    revalidateAccess();
    return { ok: true };
  });
}

/** Retire un membre du projet. */
export async function removeProjectMemberAction(
  projectId: string,
  userId: string,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(
      can(user, "manage_members"),
      "Gestion des membres réservée aux administrateurs.",
    );
    const data = projectMemberSchema.parse({ projectId, userId });
    await removeProjectMember(data.projectId, data.userId);
    revalidateAccess();
    return { ok: true };
  });
}
