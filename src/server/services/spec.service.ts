import { prisma } from "@/lib/db";
import { nextVersionNumber, specSubtree } from "@/lib/spec-package";
import { listWikiPages } from "./wiki.service";

/**
 * Service PAQUET DE SPÉCIFICATIONS - accès données pur (autorisation dans les
 * actions).
 *
 * Un paquet désigne un sous-arbre du wiki traité comme un document unique et
 * versionnable. Publier une version en fige le contenu ; les versions publiées
 * sont IMMUABLES - il n'existe volontairement aucune fonction pour en modifier
 * une, car c'est précisément ce qui permet de citer « la spécification v2 » dans
 * un ticket sans que la phrase change de sens le lendemain.
 *
 * INVARIANT : les paquets sont DISJOINTS. Une spécification imbriquée dans une
 * autre rendrait la publication ambiguë (laquelle fige quoi ?) et un lecteur ne
 * saurait plus quel document il consulte. `assertPackageable` le garantit.
 */

/** Ce que les vues affichent d'un paquet : sa racine et son état de publication. */
const packageSelect = {
  id: true,
  projectId: true,
  rootPageId: true,
  createdAt: true,
  rootPage: { select: { id: true, title: true } },
  versions: {
    orderBy: { number: "desc" as const },
    take: 1,
    select: { id: true, number: true, label: true, createdAt: true },
  },
  _count: { select: { versions: true } },
} as const;

/** Paquets du projet, du plus récemment créé au plus ancien. */
export function listSpecPackages(projectId: string) {
  return prisma.specPackage.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: packageSelect,
  });
}

/** Le paquet ancré sur cette page, si elle en est la racine. */
export function getSpecPackageByRootPage(rootPageId: string) {
  return prisma.specPackage.findUnique({
    where: { rootPageId },
    select: packageSelect,
  });
}

export function getSpecPackage(id: string) {
  return prisma.specPackage.findUnique({ where: { id }, select: packageSelect });
}

/**
 * Le paquet auquel appartient une page, qu'elle en soit la racine ou une
 * descendante quelconque. C'est ce qui permet, depuis n'importe quel chapitre,
 * de savoir qu'on lit une spécification et laquelle.
 */
export async function findSpecPackageForPage(projectId: string, pageId: string) {
  const [packages, pages] = await Promise.all([
    listSpecPackages(projectId),
    listWikiPages(projectId),
  ]);
  for (const pack of packages) {
    if (specSubtree(pages, pack.rootPageId).some((e) => e.page.id === pageId)) {
      return pack;
    }
  }
  return null;
}

/**
 * Vérifie qu'une page peut devenir la racine d'un paquet, et lève un message
 * métier sinon. Trois refus, tous destinés à garder les paquets disjoints :
 *  - la page est déjà une racine de paquet ;
 *  - elle se trouve DANS un paquet existant (un chapitre ne se versionne pas
 *    séparément du document qui le contient) ;
 *  - elle CONTIENDRAIT un paquet existant (le nouveau paquet l'avalerait).
 */
async function assertPackageable(
  projectId: string,
  rootPageId: string,
): Promise<void> {
  const [packages, pages] = await Promise.all([
    listSpecPackages(projectId),
    listWikiPages(projectId),
  ]);

  if (packages.some((pack) => pack.rootPageId === rootPageId)) {
    throw new Error("Cette page est déjà une spécification.");
  }

  const candidateSubtree = new Set(
    specSubtree(pages, rootPageId).map((entry) => entry.page.id),
  );
  if (candidateSubtree.size === 0) {
    throw new Error("Page introuvable.");
  }

  for (const pack of packages) {
    const existing = specSubtree(pages, pack.rootPageId);
    if (existing.some((entry) => entry.page.id === rootPageId)) {
      throw new Error(
        `Cette page fait déjà partie de la spécification « ${pack.rootPage.title} ».`,
      );
    }
    if (candidateSubtree.has(pack.rootPageId)) {
      throw new Error(
        `Cette page contient la spécification « ${pack.rootPage.title} » : déclarez-la plus bas dans l'arborescence, ou retirez d'abord l'autre.`,
      );
    }
  }
}

/** Déclare une page (et son sous-arbre) comme paquet de spécifications. */
export async function markPageAsSpec(projectId: string, rootPageId: string) {
  await assertPackageable(projectId, rootPageId);
  return prisma.specPackage.create({
    data: { projectId, rootPageId },
    select: packageSelect,
  });
}

/**
 * Retire la qualité de spécification. REFUSÉ dès qu'une version est publiée :
 * supprimer le paquet emporterait ses instantanés (cascade), donc l'archive que
 * des tickets citent peut-être. Les pages du wiki, elles, ne sont pas touchées.
 */
export async function unmarkSpec(id: string) {
  const published = await prisma.specVersion.count({ where: { packageId: id } });
  if (published > 0) {
    throw new Error(
      "Cette spécification a des versions publiées : elles seraient perdues. Conservez-la, ou supprimez d'abord ses versions.",
    );
  }
  return prisma.specPackage.delete({ where: { id } });
}

export interface PublishSpecVersionInput {
  packageId: string;
  label?: string | null;
  note?: string | null;
  publishedById: string;
}

/**
 * Publie une version : fige le contenu de toutes les pages du paquet, dans
 * l'ordre de lecture, avec leur chemin du moment.
 *
 * Tout se fait en UNE transaction : une version à moitié figée serait pire
 * qu'aucune version, puisqu'elle se présenterait comme un document complet.
 *
 * Le numéro est calculé dans la transaction, mais c'est la contrainte d'unicité
 * `(packageId, number)` qui tranche réellement en cas de publication simultanée :
 * la seconde échoue plutôt que d'écrire deux « v3 » différents.
 */
export async function publishSpecVersion(input: PublishSpecVersionInput) {
  return prisma.$transaction(async (tx) => {
    const pack = await tx.specPackage.findUnique({
      where: { id: input.packageId },
      select: { id: true, projectId: true, rootPageId: true },
    });
    if (!pack) throw new Error("Spécification introuvable.");

    // Le sous-arbre est recalculé ici, et non lu d'un cache : c'est l'état du
    // wiki au moment du clic que l'on fige, pas celui du chargement de la page.
    const pages = await tx.wikiPage.findMany({
      where: { projectId: pack.projectId },
      select: { id: true, title: true, parentId: true, content: true },
    });
    const entries = specSubtree(pages, pack.rootPageId);
    if (entries.length === 0) throw new Error("Spécification introuvable.");

    const numbers = await tx.specVersion.findMany({
      where: { packageId: pack.id },
      select: { number: true },
    });
    const number = nextVersionNumber(numbers.map((v) => v.number));

    const label = input.label?.trim() || null;
    const note = input.note?.trim() || null;

    return tx.specVersion.create({
      data: {
        packageId: pack.id,
        number,
        label,
        note,
        publishedById: input.publishedById,
        pages: {
          create: entries.map((entry) => ({
            pageId: entry.page.id,
            title: entry.page.title,
            content: entry.page.content,
            path: entry.path,
            order: entry.order,
          })),
        },
      },
      select: { id: true, number: true, label: true },
    });
  });
}

/** Versions publiées d'un paquet, de la plus récente à la plus ancienne. */
export function listSpecVersions(packageId: string) {
  return prisma.specVersion.findMany({
    where: { packageId },
    orderBy: { number: "desc" },
    select: {
      id: true,
      number: true,
      label: true,
      note: true,
      createdAt: true,
      publishedBy: { select: { name: true, email: true } },
      _count: { select: { pages: true } },
    },
  });
}

/** Une version publiée avec l'intégralité de son contenu figé. */
export function getSpecVersion(id: string) {
  return prisma.specVersion.findUnique({
    where: { id },
    include: {
      publishedBy: { select: { name: true, email: true } },
      package: {
        select: {
          id: true,
          projectId: true,
          rootPageId: true,
          rootPage: { select: { title: true } },
        },
      },
      pages: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          pageId: true,
          title: true,
          content: true,
          path: true,
          order: true,
        },
      },
    },
  });
}

/**
 * Supprime une version publiée. Réservé à l'administration (cf. l'action) : c'est
 * la seule entorse à l'immuabilité, prévue pour retirer une publication faite par
 * erreur, jamais pour « corriger » une version - on en publie une nouvelle.
 */
export function deleteSpecVersion(id: string) {
  return prisma.specVersion.delete({ where: { id } });
}
