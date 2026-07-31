import { cache } from "react";
import { prisma } from "@/lib/db";
import { resolveInstance, type Instance } from "@/lib/instance";

/**
 * Service RÉGLAGES D'INSTANCE - accès données pur (autorisation dans l'action).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE SEULE LIGNE, D'IDENTIFIANT FIXE
 *
 * Ce ne sont pas « des » réglages qu'on collectionne, mais « les » réglages de
 * l'application. Une clef constante rend l'unicité structurelle : impossible
 * d'en créer deux, donc jamais de doute sur celui qui fait foi.
 */

const ID = "app";

/**
 * L'apparence de cette instance, environnement surchargé par la base.
 *
 * MÉMOÏSÉE le temps d'un rendu : la pastille est dans la coque, donc sur CHAQUE
 * page ; sans cela, la même ligne serait relue plusieurs fois par affichage - le
 * manifeste, l'icône et l'en-tête pouvant coexister dans une même requête.
 *
 * Une base injoignable ne fait pas tomber la page : on se replie sur
 * l'environnement. Une application entière refusant de s'afficher parce qu'elle
 * ignore la couleur de son badge serait un remède pire que le mal.
 */
export const getInstance = cache(async (): Promise<Instance> => {
  try {
    const stored = await prisma.appSettings.findUnique({ where: { id: ID } });
    return resolveInstance(stored);
  } catch {
    return resolveInstance(null);
  }
});

/** Les valeurs ENREGISTRÉES, telles quelles - pour préremplir le formulaire. */
export function getStoredSettings() {
  return prisma.appSettings.findUnique({ where: { id: ID } });
}

/**
 * Enregistre l'apparence.
 *
 * `upsert` : la ligne n'existe pas tant que personne n'a rien réglé, et la créer
 * à l'installation aurait supposé une migration de données pour un
 * enregistrement dont on ne sait pas encore s'il servira.
 */
export function saveInstanceSettings(data: {
  instanceLabel: string | null;
  instanceColor: string | null;
}) {
  return prisma.appSettings.upsert({
    where: { id: ID },
    create: { id: ID, ...data },
    update: data,
  });
}
