import { redirect } from "next/navigation";

/**
 * Ancienne route de création, pleine page. Elle REDIRIGE désormais vers le wiki,
 * qui ouvre le formulaire dans sa colonne de lecture (cf. `?edit=new`).
 *
 * Conservée plutôt que supprimée : des liens et des favoris la désignent, et un
 * 404 sur « nouvelle page » serait une régression pour qui l'avait mise de côté.
 * Elle n'a plus d'implémentation propre - une seule existe, celle du wiki, ce
 * qui interdit aux deux de diverger.
 */
export default async function NewWikiPageRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ parent?: string }>;
}) {
  const { key } = await params;
  const { parent } = await searchParams;
  const query = new URLSearchParams({ edit: "new" });
  if (parent) query.set("parent", parent);
  redirect(`/projects/${key}/wiki?${query.toString()}`);
}
