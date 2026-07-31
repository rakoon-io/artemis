"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { appBaseUrl } from "@/lib/email";
import { headers } from "next/headers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { setPasswordSchema } from "@/lib/validators";
import { sendInviteEmail } from "@/server/mailer";
import { getUserByEmail } from "@/server/services/user.service";
import {
  issueSetupToken,
  consumeSetupToken,
} from "@/server/services/setup-token.service";
import { toErrorMessage } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Action **publique** (non authentifiée) : définir son mot de passe via un jeton
 * de première connexion. Le jeton fait office d'autorisation ; il est validé,
 * consommé (usage unique) et le mot de passe est haché en bcrypt.
 */
export async function setPasswordAction(
  input: z.input<typeof setPasswordSchema>,
): Promise<ActionResult<{ email: string }>> {
  try {
    const data = setPasswordSchema.parse(input);
    /**
     * LE JETON D'ABORD, LE HACHAGE ENSUITE.
     *
     * L'ordre inverse hachait en bcrypt coût 12 - en JavaScript pur, sur la
     * boucle d'événements - AVANT de découvrir que le jeton ne valait rien.
     * Cette action est atteignable sans session (les identifiants d'action sont
     * publics, et /activer l'est aussi) : quelques dizaines d'appels concurrents
     * avec un jeton bidon suffisaient à figer le serveur pour tout le monde.
     *
     * On paie donc le hachage seulement une fois le jeton reconnu, et la
     * cadence est bornée par adresse.
     */
    const limite = rateLimit(`setpw:${clientIp(await headers())}`, 10, 15 * 60 * 1000);
    if (!limite.ok) {
      return { ok: false, error: "Trop de tentatives. Réessayez plus tard." };
    }
    const email = await consumeSetupToken(data.token, () =>
      bcrypt.hash(data.password, 12),
    );
    if (!email) {
      return {
        ok: false,
        error: "Lien invalide ou expiré. Demandez-en un nouveau à un administrateur.",
      };
    }
    return { ok: true, data: { email } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

const resetRequestSchema = z.object({ email: z.string().email() });

/**
 * Action **publique** : demande de réinitialisation de mot de passe. Émet un jeton
 * et envoie un lien vers /activer si un compte existe. Réponse **toujours générique**
 * (anti-énumération) et **limitée en débit** par e-mail.
 */
export async function requestPasswordResetAction(
  input: z.input<typeof resetRequestSchema>,
): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  // Ne rien révéler : même réponse que l'e-mail existe ou non, soit valide ou non.
  if (!parsed.success) return { ok: true };

  const email = parsed.data.email;
  const rl = rateLimit(`reset:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return { ok: true };

  try {
    const user = await getUserByEmail(email);
    if (user) {
      const token = await issueSetupToken(user.id, "reset");
      const url = `${appBaseUrl()}/activer?token=${token}`;
      await sendInviteEmail(user.email, user.name, url, true);
    }
  } catch (error) {
    console.error("[reset] demande:", error);
  }
  return { ok: true };
}
