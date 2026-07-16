import { assert, canAccessProject, isAdmin, type PolicyUser } from "@/lib/policies";
import { isProjectMember } from "./services/membership.service";
import { getProjectByKey } from "./services/project.service";

/**
 * Garde d'accès aux projets (couche serveur). « L'UI masque, le serveur impose. »
 * Combine la politique pure `canAccessProject` avec l'appartenance en base :
 * un administrateur accède à tout ; un Rapporteur uniquement à ses projets membres.
 */

type MaybeUser = PolicyUser | null | undefined;

/** Vrai si l'utilisateur peut accéder au projet (admin, ou membre). */
export async function canAccess(
  user: MaybeUser,
  projectId: string,
): Promise<boolean> {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return canAccessProject(user, await isProjectMember(projectId, user.id));
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
  const project = await getProjectByKey(key);
  if (!project) return null;
  if (!(await canAccess(user, project.id))) return null;
  return project;
}
