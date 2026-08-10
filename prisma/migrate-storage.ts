import { PrismaClient } from "@prisma/client";
import {
  readLocal,
  readObject,
  writeLocal,
  writeObject,
} from "../src/lib/storage";

/**
 * MIGRATION DES FICHIERS ENTRE LES DEUX STOCKAGES : disque monté ⇄ objet
 * S3-compatible (MinIO). Script ponctuel, à jouer AVANT de changer le mode.
 *
 *   npm run storage:migrate -- --to=local     # objet  → disque
 *   npm run storage:migrate -- --to=s3        # disque → objet
 *   npm run storage:migrate -- --to=local --write   # écrit pour de bon
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES DEUX STOCKAGES DOIVENT ÊTRE CONFIGURÉS PENDANT LA MIGRATION
 *
 * Le mode courant se déduit de la présence des variables `S3_*` : elles doivent
 * donc rester en place le temps de la copie, `LOCAL_UPLOAD_DIR` désignant en
 * parallèle le volume. On ne retire les variables du stockage abandonné
 * qu'APRÈS avoir vérifié le résultat. C'est ce qui rend l'opération réversible :
 * tant que la source n'est pas effacée, revenir en arrière ne coûte rien.
 *
 * Ce script NE SUPPRIME JAMAIS la source. Vider l'ancien stockage est un geste
 * distinct, à faire une fois la nouvelle configuration éprouvée.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI FAIT AUTORITÉ : LA BASE, PAS LE STOCKAGE
 *
 * On parcourt les lignes `Attachment` et `WikiAttachment`, et non le contenu du
 * stockage. Un objet orphelin, sans ligne, ne sert plus à personne et n'a pas à
 * être recopié ; une ligne sans objet est au contraire une anomalie qu'il faut
 * voir, et qui est signalée en fin de course.
 *
 * IDEMPOTENT : un fichier déjà présent à destination, de même taille, est passé.
 * Relancer après une interruption reprend donc là où l'on s'était arrêté.
 */
const prisma = new PrismaClient();

type Cible = "local" | "s3";

interface Fichier {
  origine: "ticket" | "wiki";
  id: string;
  filename: string;
  contentType: string;
  storageKey: string;
}

function lireCible(): Cible {
  const brut = process.argv.find((a) => a.startsWith("--to="))?.slice(5);
  if (brut === "local" || brut === "s3") return brut;
  console.error(
    "Cible manquante ou invalide. Utilisez --to=local ou --to=s3.",
  );
  process.exit(1);
}

/** Lit dans le stockage de DÉPART, c'est-à-dire l'autre que la cible. */
function lireSource(cle: string, cible: Cible): Promise<Buffer> {
  return cible === "local" ? readObject(cle) : readLocal(cle);
}

/** Le fichier est-il déjà à destination, avec la même taille ? */
async function dejaCopie(
  cle: string,
  cible: Cible,
  taille: number,
): Promise<boolean> {
  try {
    const present = cible === "local" ? await readLocal(cle) : await readObject(cle);
    return present.byteLength === taille;
  } catch {
    return false;
  }
}

async function ecrire(
  cle: string,
  data: Buffer,
  contentType: string,
  cible: Cible,
): Promise<void> {
  if (cible === "local") await writeLocal(cle, new Uint8Array(data));
  else await writeObject(cle, new Uint8Array(data), contentType);
}

async function main() {
  const cible = lireCible();
  const ecritureReelle = process.argv.includes("--write");

  const [tickets, wiki] = await Promise.all([
    prisma.attachment.findMany({
      select: { id: true, filename: true, contentType: true, storageKey: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.wikiAttachment.findMany({
      select: { id: true, filename: true, contentType: true, storageKey: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const fichiers: Fichier[] = [
    ...tickets.map((a) => ({ origine: "ticket" as const, ...a })),
    ...wiki.map((a) => ({ origine: "wiki" as const, ...a })),
  ];

  console.log(
    `${fichiers.length} fichier(s) référencé(s) en base. Cible : ${cible}. ` +
      `Mode : ${ecritureReelle ? "ÉCRITURE" : "simulation (ajoutez --write pour écrire)"}.`,
  );

  let copies = 0;
  let passes = 0;
  const manquants: string[] = [];

  for (const f of fichiers) {
    let data: Buffer;
    try {
      data = await lireSource(f.storageKey, cible);
    } catch {
      // Ligne sans objet : on le dit, et on continue. Interrompre ici laisserait
      // la migration à moitié faite pour un fichier déjà perdu de toute façon.
      manquants.push(`${f.origine} ${f.id} (${f.filename}) : ${f.storageKey}`);
      continue;
    }

    if (await dejaCopie(f.storageKey, cible, data.byteLength)) {
      passes += 1;
      continue;
    }

    if (ecritureReelle) await ecrire(f.storageKey, data, f.contentType, cible);
    copies += 1;
  }

  console.log(
    `${copies} fichier(s) ${ecritureReelle ? "copiés" : "à copier"}, ` +
      `${passes} déjà présent(s) à destination.`,
  );

  if (manquants.length > 0) {
    console.log(
      `\n${manquants.length} ligne(s) SANS objet dans le stockage de départ :`,
    );
    for (const m of manquants) console.log(`  - ${m}`);
    console.log(
      "Ces pièces jointes étaient déjà introuvables avant la migration.",
    );
  }

  if (!ecritureReelle && copies > 0) {
    console.log("\nSimulation terminée. Relancez avec --write pour copier.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
