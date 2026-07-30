import { PrismaClient } from "@prisma/client";
import { datePrefix, slugForTitle } from "../src/lib/slug";
import { buildSearchText } from "../src/lib/search-text";

/**
 * REPRISE DES DONNÉES DÉRIVÉES DU WIKI : le SLUG (URL lisible) et le TEXTE DE
 * RECHERCHE (titre et contenu repliés, sans accents). Script ponctuel, à jouer
 * après les migrations `..._add_wiki_slug` et `..._add_wiki_search`
 * (cf. DEPLOY.md).
 *
 * Pourquoi un script plutôt que du SQL dans la migration : les deux
 * transformations sont déjà écrites et testées en TypeScript (`src/lib/slug.ts`,
 * `src/lib/search-text.ts`). Les refaire en SQL aurait donné deux algorithmes à
 * maintenir, qui auraient fini par diverger - une adresse différente pour le
 * même titre, ou un texte indexé que la requête ne retrouve plus.
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
      select: {
        id: true,
        title: true,
        content: true,
        slug: true,
        searchText: true,
        meetingDate: true,
      },
    });

    // Les slugs déjà posés sont réservés dès le départ : une page sans slug ne
    // doit pas s'attribuer celui d'une voisine.
    const taken = new Set(
      pages.map((page) => page.slug).filter((slug): slug is string => !!slug),
    );

    for (const page of pages) {
      // Un compte rendu doit porter sa date en tête d'adresse. Si ce n'est pas
      // le cas - page datée avant que la règle n'existe - on la redate, et
      // l'ancienne adresse est archivée pour que les liens partagés aboutissent
      // encore.
      const prefix = datePrefix(page.meetingDate);
      const needsPrefix = !!prefix && !page.slug?.startsWith(`${prefix}-`);
      const slug =
        page.slug && !needsPrefix
          ? page.slug
          : slugForTitle(page.title, taken, prefix);
      if (needsPrefix && page.slug && page.slug !== slug) {
        await prisma.wikiPageSlug.upsert({
          where: { projectId_slug: { projectId: project.id, slug: page.slug } },
          create: { projectId: project.id, pageId: page.id, slug: page.slug },
          update: { pageId: page.id },
        });
      }
      // Le texte de recherche est recalculé même s'il existe : il est dérivé, et
      // le recalculer est sans risque - contrairement au slug, dont dépendent
      // des favoris déjà posés.
      const searchText = buildSearchText(page.title, page.content);
      if (page.slug && !needsPrefix && page.searchText === searchText) continue;

      await prisma.wikiPage.update({
        where: { id: page.id },
        data: { slug, searchText },
      });
      taken.add(slug);
      updated += 1;
      console.log(`  ${project.key} · ${page.title} -> ${slug}`);
    }
  }

  console.log(
    updated === 0
      ? "Aucune page à reprendre : tout est déjà à jour."
      : `${updated} page(s) de wiki reprises.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
