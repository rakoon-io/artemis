import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

/**
 * Régénère le mot de passe d'un ou plusieurs comptes (identifiants
 * imprimés sur stdout - à transmettre au titulaire par un canal sûr, jamais
 * commités). Utile après une exposition publique (ex. identifiants affichés
 * en mode démo) ou une rotation de routine.
 *
 * Usage : npx tsx prisma/rotate-passwords.ts admin@rakoon.io rapporteur@rakoon.io
 */
const prisma = new PrismaClient();

function generatePassword(): string {
  return randomBytes(18).toString("base64url"); // ~24 caractères, sans caractères ambigus d'URL
}

async function rotate(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { email }, data: { passwordHash } });
  return password;
}

async function main() {
  const emails = process.argv.slice(2);
  if (emails.length === 0) {
    console.error("Usage : tsx prisma/rotate-passwords.ts <email> [email...]");
    process.exit(1);
  }
  for (const email of emails) {
    const password = await rotate(email);
    if (password === null) {
      console.log(`${email} -> compte introuvable, ignoré`);
    } else {
      console.log(`${email} -> ${password}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
