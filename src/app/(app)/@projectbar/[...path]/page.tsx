import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getAccessibleProjectByKey } from "@/server/access";
import { Badge } from "@/components/ui/badge";
import { ProjectNav } from "@/components/project/project-nav";

/**
 * IDENTITÉ ET NAVIGATION DU PROJET, dans la barre du haut.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN CRÉNEAU PARALLÈLE
 *
 * Ce bandeau appartient visuellement à la coque, et logiquement au projet : il
 * doit s'afficher DANS l'en-tête global, tout en dépendant d'une route bien
 * plus profonde. Or la coque est un layout partagé - lors d'une navigation
 * douce, React ne la rejoue pas -, et elle ignore de toute façon la clé du
 * projet : rien, dans son segment, ne la lui donne.
 *
 * Un créneau parallèle (`@projectbar`) résout ce cas : il se résout contre l'URL
 * à chaque navigation, tout en s'affichant à l'endroit que la coque lui réserve.
 * Le rendu reste entièrement côté serveur - pas de contexte client, pas de
 * bandeau qui apparaîtrait après l'hydratation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FOURRE-TOUT PLUTÔT QUE `projects/[key]/…`
 *
 * Un créneau garde son DERNIER rendu quand la nouvelle URL ne lui correspond
 * pas : `default.tsx` ne le relève qu'au chargement complet, pas en navigation
 * douce. Une barre limitée aux routes de projet restait donc affichée en
 * revenant à la liste des projets - mesuré, pas supposé.
 *
 * Ce fourre-tout couvre TOUTES les routes de l'espace connecté : il n'existe
 * plus d'URL « sans correspondance », donc plus de bandeau fantôme. C'est ce
 * fichier, et non le routeur, qui décide de ne rien afficher hors projet. Le
 * `default.tsx` voisin ne devrait donc jamais servir - Next l'exige néanmoins
 * dès qu'un autre créneau existe dans l'arbre, et refuse de compiler sans lui.
 *
 * Le fourre-tout est REQUIS (`[...path]`) et non facultatif : facultatif, il
 * couvrirait aussi la racine, qu'une redirection occupe déjà - le routeur
 * refuse alors deux routes de même précision. Aucune page de l'espace connecté
 * n'ayant zéro segment, la couverture reste entière.
 */
export default async function ProjectBar({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const [section, key] = path;
  if (section !== "projects" || !key) return null;

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  // Projet inexistant ou interdit : on n'affiche rien, et l'on s'abstient
  // d'appeler `notFound()`. Le sort de la page appartient à la page ; un créneau
  // qui la ferait échouer déciderait à sa place. (Un 404, lui, remplace tout
  // l'arbre - en-tête compris : la question du bandeau ne s'y pose pas.)
  if (!project) return null;

  return (
    <div
      /**
       * `order-last` + `w-full` : sur petit écran, la barre passe à la ligne
       * SOUS la marque et les commandes, plutôt que de disputer 390 pixels à
       * sept onglets. À partir de `md`, elle reprend sa place sur la ligne
       * unique - c'est là qu'on gagne la hauteur.
       *
       * `self-stretch` sans marge basse : les onglets touchent le bas de
       * l'en-tête, et le soulignement de l'actif se pose exactement sur sa
       * bordure. Dans les deux dispositions, la barre est le contenu le plus
       * bas, donc l'alignement tient sans cas particulier.
       */
      className="order-last flex min-h-11 w-full min-w-0 items-stretch gap-3 self-stretch md:order-none md:min-h-0 md:w-auto"
      style={
        // La couleur du projet teinte le soulignement de l'onglet actif : la
        // page la pose sur SON contenu, hors de portée d'un en-tête qui la
        // surplombe.
        project.accentColor
          ? ({
              ["--primary"]: project.accentColor,
              ["--ring"]: project.accentColor,
            } as CSSProperties)
          : undefined
      }
    >
      {/* `shrink-0` : l'identité du projet ne se comprime pas. Laissée
          rétrécissable, elle s'effaçait entièrement sur téléphone - il ne
          restait du nom qu'un caractère et des points de suspension. C'est aux
          ONGLETS de défiler quand la place manque ; eux le disent. La largeur
          maximale, elle, empêche un nom fleuve de les repousser hors de vue. */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="hidden h-5 w-px shrink-0 bg-border md:block"
          aria-hidden
        />
        <Badge variant="secondary" className="shrink-0 font-mono">
          {project.key}
        </Badge>
        {/* Le titre du projet reste le `h1` du document : il a seulement changé
            de place, pas de rang. */}
        <h1 className="max-w-[9rem] truncate text-sm font-semibold tracking-tight md:max-w-[16rem]">
          {project.name}
        </h1>
      </div>

      <ProjectNav projectKey={project.key} isAdmin={isAdmin(session?.user)} />
    </div>
  );
}
