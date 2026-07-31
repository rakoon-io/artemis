import { cache } from "react";
import { assert, canAccessProject, isAdmin, type PolicyUser } from "@/lib/policies";
import { isProjectMember } from "./services/membership.service";
import { getProjectByKey } from "./services/project.service";

/**
 * Garde d'accès aux projets (couche serveur). « L'UI masque, le serveur impose. »
 * Combine la politique pure `canAccessProject` avec l'appartenance en base :
 * un administrateur accède à tout ; un Rapporteur uniquement à ses projets membres.
 */

type MaybeUser = PolicyUser | null | undefined;

/**
 * Lectures MÉMOÏSÉES le temps d'un rendu.
 *
 * La barre de projet et la page qu'elle surmonte sont deux branches parallèles
 * de l'arbre : elles résolvent le même projet, dans la même requête, sans
 * pouvoir se passer le résultat. Mesuré sur la liste des tickets, sans
 * mémoïsation : TROIS lectures du même projet pour un seul affichage - la
 * barre, le layout, la page. Il n'en reste qu'une.
 *
 * `cache()` s'indexe sur les arguments par IDENTITÉ : d'où des clés de type
 * chaîne, et non l'objet utilisateur, dont `auth()` rend une instance neuve à
 * chaque appel - la mémoïsation n'y ferait jamais mouche.
 *
 * Hors rendu React (le serveur MCP, par exemple), `cache` appelle simplement la
 * fonction : rien à prévoir de ce côté.
 */
const readProject = cache((key: string) => getProjectByKey(key));
const readMembership = cache((projectId: string, userId: string) =>
  isProjectMember(projectId, userId),
);

/** Vrai si l'utilisateur peut accéder au projet (admin, ou membre). */
export async function canAccess(
  user: MaybeUser,
  projectId: string,
): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return canAccessProject(user, await readMembership(projectId, user.id));
}

/** Lève ForbiddenError si l'utilisateur n'a pas accès au projet (usage actions/API). */
export async function assertProjectAccess(
  user: MaybeUser,
  projectId: string,
): Promise<void> {
  assert(await canAccess(user, projectId), "Vous n'avez pas accès à ce projet.");
}

/**
 * Résout un projet par sa clé en imposant l'accès : renvoie le projet si
 * l'utilisateur y a accès, sinon `null` (les pages appellent alors `notFound()`,
 * indistinguable d'un projet inexistant - on ne divulgue pas son existence).
 */
export async function getAccessibleProjectByKey(user: MaybeUser, key: string) {
  const project = await readProject(key);
  if (!project) return null;
  if (!(await canAccess(user, project.id))) return null;
  return project;
}
