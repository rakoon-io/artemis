import { PrismaClient } from "@prisma/client";

/**
 * Réinitialise l'environnement de démo au jeu de base : supprime le projet de
 * démo (`RKN`) et TOUT ce qui en dépend (colonnes, tickets, sprints, labels,
 * modules, composants, commentaires, pièces jointes, pages wiki - toutes les
 * relations du schéma pointent vers `Project` en `onDelete: Cascade`), puis
 * laisse `db:seed` (enchaîné par `npm run db:reset-demo`) le recréer à
 * l'identique.
 *
 * Les comptes (`admin@rakoon.io`, `rapporteur@rakoon.io`, `bot@rakoon.io`) ne
 * sont volontairement PAS supprimés : les identifiants de démo restent stables
 * d'une réinitialisation à l'autre (`prisma/seed.ts` les recrée via `upsert`
 * de toute façon si absents).
 */
const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.findUnique({ where: { key: "RKN" } });
  if (!project) {
    console.log("Rien à réinitialiser (projet RKN absent).");
    return;
  }
  await prisma.project.delete({ where: { id: project.id } });
  console.log("Projet de démo RKN réinitialisé (données supprimées).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
