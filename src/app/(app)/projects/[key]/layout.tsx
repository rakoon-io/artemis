import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";

/**
 * Layout d'un projet : impose l'accès, et teinte le contenu à sa couleur.
 *
 * Le nom du projet et ses onglets ne sont plus ici : ils ont rejoint la barre du
 * haut (`@projectbar`), qui les affiche sur la même ligne que la marque. Ce
 * layout garde la GARDE - `notFound()` sur un projet inconnu ou interdit -,
 * indissociable de la page qu'il protège. Le projet n'est lu qu'une fois : la
 * mémoïsation de `getAccessibleProjectByKey` couvre les deux branches.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  return (
    <div
      // `flex flex-col` reste indispensable : le tableau Kanban s'y déclare
      // `flex-1` pour occuper la hauteur restante. L'écart entre blocs, lui, a
      // disparu avec le bandeau qu'il séparait du contenu.
      className="flex min-h-0 flex-1 flex-col px-4 py-5 md:px-6"
      style={
        project.accentColor
          ? ({
              ["--primary"]: project.accentColor,
              ["--ring"]: project.accentColor,
            } as CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
