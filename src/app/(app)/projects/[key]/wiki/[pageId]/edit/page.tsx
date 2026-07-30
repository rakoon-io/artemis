import { redirect } from "next/navigation";

/**
 * Ancienne route d'édition, pleine page. Elle REDIRIGE vers le wiki, qui ouvre
 * le formulaire dans sa colonne de lecture (cf. `?edit=page`).
 *
 * L'identifiant suffit : la résolution du wiki accepte aussi bien un slug qu'un
 * identifiant, et renverra l'adresse lisible.
 */
export default async function EditWikiPageRedirect({
  params,
}: {
  params: Promise<{ key: string; pageId: string }>;
}) {
  const { key, pageId } = await params;
  redirect(`/projects/${key}/wiki?page=${pageId}&edit=page`);
}
