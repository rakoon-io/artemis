import { EmailStatus } from "@prisma/client";
import { inviteEmailHtml, sendEmail, type SendEmailArgs } from "@/lib/email";
import { recordEmail } from "./services/email-log.service";

/**
 * Point d'envoi unique des e-mails : appelle Mailjet (via `sendEmail`) **et**
 * journalise chaque tentative (SENT / FAILED / DISABLED) pour un suivi complet.
 * Ne lève jamais - un échec d'e-mail ne doit pas casser l'action appelante.
 */

export type EmailType = "comment" | "assignment" | "invite" | "reset";

/** Envoie un e-mail et le journalise. Renvoie le résultat de l'envoi. */
export async function deliver(
  args: SendEmailArgs & { type: EmailType },
): Promise<{ sent: boolean; error?: string }> {
  const { type, ...email } = args;
  const res = await sendEmail(email);
  const status = res.sent
    ? EmailStatus.SENT
    : res.error === "email_not_configured"
      ? EmailStatus.DISABLED
      : EmailStatus.FAILED;
  try {
    await recordEmail({
      to: email.to,
      subject: email.subject,
      type,
      status,
      error: res.sent ? null : res.error,
    });
  } catch (error) {
    console.error("[mailer] journalisation e-mail:", error);
  }
  return res;
}

/** Compose et envoie (journalisé) un lien de première connexion / réinitialisation. */
export function sendInviteEmail(
  to: string,
  name: string | null,
  url: string,
  reset = false,
): Promise<{ sent: boolean; error?: string }> {
  return deliver({
    to,
    toName: name ?? undefined,
    subject: reset
      ? "Reinitialiser votre mot de passe Artemis"
      : "Votre acces a Artemis",
    html: inviteEmailHtml({ name, url, reset }),
    type: reset ? "reset" : "invite",
  });
}
