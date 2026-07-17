"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { Role } from "@prisma/client";
import { assert, isAdmin } from "@/lib/policies";
import { adminCreateUserSchema, updateUserRoleSchema } from "@/lib/validators";
import {
  countAdmins,
  createUser,
  deleteUser,
  getUserById,
  updateUserRole,
} from "@/server/services/user.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Revalide les vues dépendant des comptes (page Utilisateurs, listes projet). */
function revalidateUsers(): void {
  revalidatePath("/users");
  revalidatePath("/projects", "layout");
}

/** Crée un compte utilisateur (rôle attribué). Réservé à l'Admin. */
export async function createUserAction(
  input: z.input<typeof adminCreateUserSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), "Réservé aux administrateurs.");
    const data = adminCreateUserSchema.parse(input);
    // `createUser` lève « Cet e-mail est déjà utilisé. » si l'e-mail est pris.
    const created = await createUser(data);
    revalidateUsers();
    return { ok: true, data: { id: created.id } };
  });
}

/**
 * Change le rôle d'un utilisateur. Réservé à l'Admin. Garde « dernier admin » :
 * on refuse de rétrograder le seul ADMIN restant en REPORTER.
 */
export async function updateUserRoleAction(
  userId: string,
  role: Role,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), "Réservé aux administrateurs.");
    const data = updateUserRoleSchema.parse({ userId, role });

    if (data.role === Role.REPORTER) {
      const target = await getUserById(data.userId);
      if (target?.role === Role.ADMIN && (await countAdmins()) <= 1) {
        return { ok: false, error: "Au moins un administrateur est requis." };
      }
    }

    const updated = await updateUserRole(data.userId, data.role);
    revalidateUsers();
    return { ok: true, data: { id: updated.id } };
  });
}

/**
 * Supprime un utilisateur. Réservé à l'Admin. Interdit de se supprimer soi-même
 * et de retirer le dernier administrateur.
 */
export async function deleteUserAction(userId: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), "Réservé aux administrateurs.");

    if (userId === user.id) {
      return {
        ok: false,
        error: "Vous ne pouvez pas supprimer votre propre compte.",
      };
    }

    const target = await getUserById(userId);
    if (!target) return { ok: false, error: "Utilisateur introuvable." };

    if (target.role === Role.ADMIN && (await countAdmins()) <= 1) {
      return { ok: false, error: "Au moins un administrateur est requis." };
    }

    await deleteUser(userId);
    revalidateUsers();
    return { ok: true };
  });
}
