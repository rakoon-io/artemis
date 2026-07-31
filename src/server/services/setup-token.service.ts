import { prisma } from "@/lib/db";
import {
  generateSetupToken,
  hashSetupToken,
  RESET_TOKEN_TTL_MS,
  SETUP_TOKEN_TTL_MS,
} from "@/lib/setup-token";

/**
 * Service des jetons de premiere connexion. Un seul jeton actif par utilisateur :
 * en regenerer un remplace le precedent (l'ancien lien devient invalide).
 */

/** Emet (ou remplace) un jeton pour l'utilisateur et renvoie le jeton brut. */
export async function issueSetupToken(
  userId: string,
  /**
   * `invite` : premiere connexion, sept jours. `reset` : mot de passe oublie,
   * une heure. Le meme jeton sert les deux usages, mais pas la meme urgence.
   */
  usage: "invite" | "reset" = "invite",
): Promise<string> {
  const raw = generateSetupToken();
  const tokenHash = hashSetupToken(raw);
  const expiresAt = new Date(
    Date.now() + (usage === "reset" ? RESET_TOKEN_TTL_MS : SETUP_TOKEN_TTL_MS),
  );
  await prisma.passwordSetupToken.upsert({
    where: { userId },
    update: { tokenHash, expiresAt },
    create: { userId, tokenHash, expiresAt },
  });
  return raw;
}

/** Contexte d'un jeton (sans le consommer) : e-mail de l'utilisateur, ou null si invalide/expire. */
export async function getSetupContext(
  raw: string,
): Promise<{ email: string; name: string | null } | null> {
  if (!raw) return null;
  const row = await prisma.passwordSetupToken.findUnique({
    where: { tokenHash: hashSetupToken(raw) },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) return null;
  return { email: row.user.email, name: row.user.name };
}

/**
 * Definit le mot de passe via le jeton, en une transaction : valide le jeton,
 * met a jour le hash de mot de passe, puis consomme le jeton (usage unique).
 * Renvoie l'e-mail de l'utilisateur en cas de succes, sinon null.
 */
export async function setPasswordWithToken(
  raw: string,
  passwordHash: string,
): Promise<string | null> {
  return consumeSetupToken(raw, async () => passwordHash);
}

/**
 * Idem, mais le condensat n'est CALCULÉ qu'une fois le jeton reconnu.
 *
 * Le hachage bcrypt coûte volontairement cher ; le payer avant de savoir si le
 * jeton existe offrait à un anonyme un moyen de saturer le processeur du
 * serveur (cf. `setPasswordAction`). L'appelant passe donc une promesse de
 * condensat, qu'on ne réclame qu'au dernier moment - à l'intérieur de la
 * transaction, entre la lecture du jeton et son effacement.
 */
export async function consumeSetupToken(
  raw: string,
  hacher: () => Promise<string>,
): Promise<string | null> {
  if (!raw) return null;
  const tokenHash = hashSetupToken(raw);
  try {
    return await prisma.$transaction(async (tx) => {
      const row = await tx.passwordSetupToken.findUnique({
        where: { tokenHash },
        include: { user: { select: { email: true } } },
      });
      if (!row || row.expiresAt.getTime() <= Date.now()) return null;
      /**
       * Le compteur de révocation est incrémenté EN MÊME TEMPS que le mot de
       * passe : toutes les sessions ouvertes de ce compte s'éteignent.
       *
       * C'est ce qu'on attend d'une réinitialisation - on la demande justement
       * quand on soupçonne qu'un autre est entré. Sans cela, elle changeait le
       * mot de passe et laissait le voleur connecté.
       */
      await tx.user.update({
        where: { id: row.userId },
        data: { passwordHash: await hacher(), sessionEpoch: { increment: 1 } },
      });
      await tx.passwordSetupToken.delete({ where: { id: row.id } });
      return row.user.email;
    });
  } catch {
    return null;
  }
}
