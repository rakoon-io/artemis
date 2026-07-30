import { PrismaClient } from "@prisma/client";
import { slugForTitle } from "../src/lib/slug";

/**
 * REPRISE DES SLUGS - donne une URL lisible aux pages de wiki créées avant la
 * fonctionnalité. Script ponctuel, à jouer une fois après la migration
 * `20260730180000_add_wiki_slug` (cf. DEPLOY.md).
 *
 * Pourquoi un script plutôt que du SQL dans la migration : la fabrication du
 * slug est déjà écrite et testée en TypeScript (`src/lib/slug.ts`). La refaire
 * en SQL aurait donné deux algorithmes à maintenir, qui auraient fini par
 * produire des adresses différentes pour le même titre.
 *
 * IDEMPOTENT : les pages qui ont déjà un slug ne sont pas touchées, on peut donc
 * le rejouer sans risque. Les pages sont traitées de la plus ancienne à la plus
 * récente, si bien que deux homonymes départagent toujours dans le même ordre.
 */
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany({ select: { id: true, key: true } });
  let updated = 0;

  for (const project of projects) {
    const pages = await prisma.wikiPage.findMany({
      where: { projectId: project.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, title: true, slug: true },
    });

    // Les slugs déjà posés sont réservés dès le départ : une page sans slug ne
    // doit pas s'attribuer celui d'une voisine.
    const taken = new Set(
      pages.map((page) => page.slug).filter((slug): slug is string => !!slug),
    );

    for (const page of pages) {
      if (page.slug) continue;
      const slug = slugForTitle(page.title, taken);
      await prisma.wikiPage.update({ where: { id: page.id }, data: { slug } });
      taken.add(slug);
      updated += 1;
      console.log(`  ${project.key} · ${page.title} -> ${slug}`);
    }
  }

  console.log(
    updated === 0
      ? "Aucune page à reprendre : toutes ont déjà un slug."
      : `${updated} page(s) de wiki ont reçu un slug.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
