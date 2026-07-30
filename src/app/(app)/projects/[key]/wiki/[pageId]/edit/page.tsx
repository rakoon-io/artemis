import { redirect } from "next/navigation";

/**
 * Ancienne route d'édition, pleine page. Elle mène désormais à la PAGE ELLE-MÊME :
 * il n'y a plus de formulaire d'édition, le titre, le rangement et le contenu se
 * modifient là où ils s'affichent.
 *
 * Conservée plutôt que supprimée : des liens et des favoris la désignent, et un
 * 404 serait une régression pour qui l'avait mise de côté.
 */
export default async function EditWikiPageRedirect({
  params,
}: {
  params: Promise<{ key: string; pageId: string }>;
}) {
  const { key, pageId } = await params;
  redirect(`/projects/${key}/wiki?page=${pageId}`);
}
