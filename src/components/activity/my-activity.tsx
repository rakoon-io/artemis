import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_COLORS,
  type Activity,
  type ActivityCategory,
  pickVisible,
  type ActivityEntry,
} from "@/lib/my-activity";
import { cn, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * MON ACTIVITÉ - ce que j'ai sur les bras, en tête de l'accueil.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI EN HAUT DE L'ACCUEIL
 *
 * L'accueil listait les PROJETS. Or on n'arrive pas au travail en se demandant
 * « quels projets existent ? » mais « qu'est-ce que j'ai à faire ? » - et il
 * fallait ouvrir chaque projet, puis filtrer sur soi, pour l'apprendre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * D'ABORD LA FORME, ENSUITE LE DÉTAIL
 *
 * Replié, le bloc tient en deux lignes : une barre qui montre la RÉPARTITION, et
 * sa légende qui donne les nombres. C'est la question qu'on se pose en arrivant
 * (« où en suis-je ? »), et elle ne mérite pas de faire défiler l'écran.
 * Déplié, la chronologie complète, du plus récemment touché au plus ancien -
 * l'ordre qui répond à « qu'est-ce qui a bougé ? ».
 *
 * `<details>` plutôt qu'un état de composant : le pli n'a pas besoin de
 * JavaScript, survit au rendu serveur, s'imprime déplié et se laisse chercher
 * dans la page par le navigateur. C'est déjà le choix du wiki et du tableau.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA BARRE, ET CE QU'ELLE NE FAIT PAS
 *
 * Une barre empilée dit une part-au-tout, et c'en est une : chaque élément
 * appartient à exactement une catégorie (cf. `@/lib/my-activity`).
 *
 * Aucune valeur n'est écrite DANS les segments : un segment étroit rognerait son
 * étiquette, ce qui est pire que pas d'étiquette du tout. Les nombres vivent
 * dans la légende - toujours visible, jamais tronquée - et le détail complet
 * dans la liste dépliable, qui joue le rôle de « vue tableau ». Rien n'est donc
 * accessible par la seule couleur, ni par le seul survol.
 *
 * Les segments sont séparés par un VIDE de 2 px (couleur du fond), et non par un
 * trait : un contour ajouterait de l'encre qui n'est pas de la donnée.
 */

/** Au-delà, la chronologie cesse d'être lisible et devient un mur. */
const MAX_LIGNES = 12;

export async function MyActivity({ activity }: { activity: Activity }) {
  const t = await getDictionary();
  const { counts, entries } = activity;

  const libelles: Record<ActivityCategory, string> = {
    todo: t.activity.todo,
    doing: t.activity.doing,
    done: t.activity.done,
    wiki: t.activity.wiki,
  };

  if (counts.total === 0) {
    return (
      <Card>
        <CardContent className="py-5">
          <h2 className="text-sm font-medium">{t.activity.title}</h2>
          <p className="pt-1 text-sm text-muted-foreground">
            {t.activity.empty}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Pas un simple `slice` : cf. `pickVisible`, qui garantit que chaque
  // catégorie annoncée par la légende figure bien dans la liste.
  const visibles = pickVisible(entries, MAX_LIGNES);
  const reste = entries.length - visibles.length;

  return (
    <Card>
      {/* `open` par défaut serait un contresens : le pli n'aurait plus lieu
          d'être si l'on montrait tout d'entrée. */}
      <details className="group/activite">
        {/* `aria-label` : sans lui, le nom du bouton de pli serait la
            CONCATÉNATION de tout ce qu'il contient - titre, description de la
            barre, puis les quatre entrées de légende. Annoncé d'un trait, c'est
            illisible ; le détail reste lu à sa place, dans la barre et la
            légende. */}
        <summary
          aria-label={t.activity.toggleAria}
          className="flex cursor-pointer list-none flex-col gap-3 px-6 py-5 [&::-webkit-details-marker]:hidden"
        >
          <div className="flex items-center gap-2">
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open/activite:rotate-90"
              aria-hidden
            />
            <h2 className="text-sm font-medium">{t.activity.title}</h2>
            <span className="text-sm text-muted-foreground">
              {fmt(t.activity.total, { count: counts.total })}
            </span>
          </div>

          <RepartitionBar counts={counts} libelles={libelles} t={t} />

          <Legende counts={counts} libelles={libelles} />
        </summary>

        <div className="border-t px-6 py-4">
          <p className="pb-3 text-xs text-muted-foreground">
            {t.activity.recentFirst}
          </p>
          <ul className="flex flex-col divide-y">
            {visibles.map((entry) => (
              <Ligne key={`${entry.kind}-${entry.id}`} entry={entry} t={t} />
            ))}
          </ul>
          {reste > 0 && (
            <p className="pt-3 text-xs text-muted-foreground">
              {fmt(t.activity.more, { count: reste })}
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}

type Dict = Awaited<ReturnType<typeof getDictionary>>;

/**
 * La barre empilée. Les segments se partagent la largeur au prorata de leur
 * effectif (`flex-grow`), ce qui laisse les 2 px d'écart se prendre sur le tout
 * sans jamais faire déborder la somme - un calcul en pourcentage, lui, aurait
 * dépassé 100 % dès qu'on y ajoute des écarts.
 */
function RepartitionBar({
  counts,
  libelles,
  t,
}: {
  counts: Activity["counts"];
  libelles: Record<ActivityCategory, string>;
  t: Dict;
}) {
  // Une catégorie vide n'a pas de segment : un filet de 2 px ne se lit pas, et
  // se confondrait avec l'écart qui sépare ses voisins.
  const segments = ACTIVITY_CATEGORIES.filter((c) => counts[c] > 0);

  const resume = segments
    .map((c) => `${counts[c]} ${libelles[c].toLowerCase()}`)
    .join(", ");

  return (
    <div
      role="img"
      aria-label={fmt(t.activity.chartAria, { detail: resume })}
      className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
    >
      {segments.map((c) => (
        <div
          key={c}
          // `flex-basis: 0` : la largeur vient ENTIÈREMENT du prorata, sinon le
          // contenu (vide) fausserait le partage.
          style={{ flexGrow: counts[c], flexBasis: 0, backgroundColor: ACTIVITY_COLORS[c] }}
          /* Infobulle native : au survol, sans JavaScript. Rien d'essentiel n'y
             est caché - la légende juste dessous porte déjà les mêmes nombres.
             Aucun texte pour les lecteurs d'écran ici : `role="img"` fait de la
             barre une FEUILLE, dont les enfants ne sont pas lus - c'est
             `aria-label` qui parle pour elle. */
          title={`${counts[c]} ${libelles[c]}`}
        />
      ))}
    </div>
  );
}

/**
 * La légende : l'identité ne passe jamais par la seule couleur, et les nombres
 * y sont toujours lisibles. Le texte porte les teintes du THÈME, jamais celles
 * de la donnée - une pastille colorée à côté suffit à faire le lien.
 */
function Legende({
  counts,
  libelles,
}: {
  counts: Activity["counts"];
  libelles: Record<ActivityCategory, string>;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {/* Une catégorie vide garde un texte PLEINEMENT lisible : l'atténuer
          ferait tomber le contraste sous le seuil, pour ne dire que ce que le
          « 0 » dit déjà. Seule la pastille s'efface. */}
      {ACTIVITY_CATEGORIES.map((c) => (
        <li key={c} className="flex items-center gap-1.5 text-xs">
          <span
            className={cn("size-2 shrink-0 rounded-full", counts[c] === 0 && "opacity-40")}
            style={{ backgroundColor: ACTIVITY_COLORS[c] }}
            aria-hidden
          />
          <span className="text-muted-foreground">{libelles[c]}</span>
          <span className="font-medium tabular-nums">{counts[c]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Une ligne de la chronologie : un ticket, ou une page où l'on est cité. */
function Ligne({ entry, t }: { entry: ActivityEntry; t: Dict }) {
  const href =
    entry.kind === "ticket"
      ? `/projects/${entry.projectKey}/tickets/${entry.id}`
      : `/projects/${entry.projectKey}/wiki?page=${entry.handle}`;

  return (
    <li className="py-2">
      {/**
       * DEUX LIGNES SUR UN TÉLÉPHONE, UNE SEULE AU LARGE.
       *
       * Tout sur une ligne, le titre était le seul élément élastique : la clé,
       * le statut et le projet, tous incompressibles, le réduisaient à une
       * quinzaine de pixels sur un écran étroit - une ligne sans titre, donc
       * sans moyen de distinguer deux tickets. Sous `sm`, le titre prend donc
       * sa propre ligne et les repères passent dessous.
       */}
      <Link
        href={href}
        className="group flex flex-col gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2"
      >
        <span className="flex min-w-0 items-baseline gap-2 sm:contents">
          <span
            className="size-2 shrink-0 translate-y-px rounded-full"
            style={{ backgroundColor: ACTIVITY_COLORS[entry.category] }}
            aria-hidden
          />
          {entry.kind === "ticket" ? (
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {entry.key}
            </span>
          ) : (
            <FileText
              className="size-3.5 shrink-0 translate-y-0.5 text-muted-foreground"
              aria-hidden
            />
          )}
          <span
            /* `title` : le survol rend le titre entier quand il est tronqué. */
            title={entry.title}
            className={cn(
              "min-w-0 flex-1 truncate text-sm group-hover:underline",
              /* ACHEVÉ : barré et atténué, comme sur les sprints et les versions. */
              entry.category === "done" &&
                "text-muted-foreground line-through decoration-muted-foreground/60",
            )}
          >
            {entry.title}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 pl-4 sm:contents sm:pl-0">
          <Badge variant="outline" className="shrink-0 text-[11px] font-normal">
            {entry.kind === "ticket" ? entry.status : t.activity.wikiBadge}
          </Badge>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {entry.projectKey}
          </span>
          <time
            dateTime={entry.at.toISOString()}
            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
          >
            {formatDate(entry.at)}
          </time>
        </span>
      </Link>
    </li>
  );
}
