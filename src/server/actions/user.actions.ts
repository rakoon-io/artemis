"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { Role } from "@prisma/client";
import { assert, isAdmin } from "@/lib/policies";
import { appBaseUrl } from "@/lib/email";
import { sendInviteEmail } from "@/server/mailer";
import { adminCreateUserSchema, updateUserRoleSchema } from "@/lib/validators";
import {
  countAdmins,
  createUser,
  deleteUser,
  getUserById,
  updateUserRole,
  userHasPassword,
} from "@/server/services/user.service";
import { issueSetupToken } from "@/server/services/setup-token.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Construit l'URL de premiere connexion pour un jeton donne. */
function setupUrl(token: string): string {
  return `${appBaseUrl()}/activer?token=${token}`;
}

/** Revalide les vues dépendant des comptes (page Utilisateurs, listes projet). */
function revalidateUsers(): void {
  revalidatePath("/users");
  revalidatePath("/projects", "layout");
}

/** Résultat d'une action pouvant produire un lien de première connexion. */
interface SetupLinkResult {
  id: string;
  email: string;
  /** Présent si un lien de première connexion a été généré. */
  setupUrl?: string;
  /** Vrai si l'e-mail a effectivement été envoyé (Mailjet configuré). */
  emailSent?: boolean;
}

/**
 * Crée un compte utilisateur (rôle attribué). Réservé à l'Admin. Sans mot de
 * passe, l'utilisateur reçoit un **lien de première connexion** (renvoyé à l'admin
 * pour copie, et envoyé par e-mail si Mailjet est configuré).
 */
export async function createUserAction(
  input: z.input<typeof adminCreateUserSchema>,
): Promise<ActionResult<SetupLinkResult>> {
  return withUser<SetupLinkResult>(async (user) => {
    assert(isAdmin(user), "Réservé aux administrateurs.");
    const data = adminCreateUserSchema.parse(input);
    // `createUser` lève « Cet e-mail est déjà utilisé. » si l'e-mail est pris.
    const created = await createUser(data);
    revalidateUsers();

    if (data.password) {
      return { ok: true, data: { id: created.id, email: created.email } };
    }
    // Mode lien : jeton de première connexion.
    const token = await issueSetupToken(created.id);
    const url = setupUrl(token);
    const mail = await sendInviteEmail(created.email, created.name, url, false);
    return {
      ok: true,
      data: { id: created.id, email: created.email, setupUrl: url, emailSent: mail.sent },
    };
  });
}

/**
 * (Re)génère un lien de première connexion / réinitialisation pour un utilisateur
 * existant, à tout moment. Réservé à l'Admin. Renvoie le lien (pour copie) et
 * l'envoie par e-mail si Mailjet est configuré. L'ancien lien devient invalide.
 */
export async function resendSetupLinkAction(
  userId: string,
): Promise<ActionResult<{ email: string; setupUrl: string; emailSent: boolean }>> {
  return withUser<{ email: string; setupUrl: string; emailSent: boolean }>(
    async (user) => {
      assert(isAdmin(user), "Réservé aux administrateurs.");
      const target = await getUserById(userId);
      if (!target) return { ok: false, error: "Utilisateur introuvable." };
      const reset = await userHasPassword(userId);
      const token = await issueSetupToken(userId);
      const url = setupUrl(token);
      const mail = await sendInviteEmail(target.email, target.name, url, reset);
      return {
        ok: true,
        data: { email: target.email, setupUrl: url, emailSent: mail.sent },
      };
    },
  );
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
