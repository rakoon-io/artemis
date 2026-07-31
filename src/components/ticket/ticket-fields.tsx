import type { ComponentKind, TicketTemplate } from "@prisma/client";
import { Blocks, FileText, Server, type LucideIcon } from "lucide-react";
import type { ModuleRef } from "@/lib/effective-module";
import { cn } from "@/lib/utils";
import type {
  getMembers,
  getSprints,
  getLabels,
  getTicketsList,
  getTicketDetail,
} from "@/server/queries";

/**
 * Constantes, libellés FR et petits composants d'affichage partagés par la vue
 * liste, le détail et les formulaires de ticket. Types dérivés des queries
 * (import type uniquement - aucun code serveur n'atteint le bundle client).
 */

// Types dérivés des couches de lecture (queries).
export type Member = Awaited<ReturnType<typeof getMembers>>[number];
export type SprintOption = Awaited<ReturnType<typeof getSprints>>[number];
export type LabelOption = Awaited<ReturnType<typeof getLabels>>[number];
export type TicketRow = Awaited<ReturnType<typeof getTicketsList>>["items"][number];
/**
 * Colonne du tableau, c'est-à-dire un STATUT. Réduite à ce qu'une liste
 * déroulante en a besoin : les surfaces qui la reçoivent n'ont que faire des
 * tickets qu'elle contient.
 */
export type ColumnOption = { id: string; name: string };
export type TicketDetail = NonNullable<Awaited<ReturnType<typeof getTicketDetail>>>;

/**
 * Type / priorité de ticket : désormais des données configurables par projet
 * (plus des enums). Alimentés par `getTicketTypes` / `getTicketPriorities`.
 */
export type TicketTypeOption = {
  id: string;
  name: string;
  color: string;
  order?: number;
  /**
   * Modèle imposé à la description des tickets de ce type. Absent = `NONE`
   * (description libre) : les surfaces qui ne s'en soucient pas n'ont rien à
   * transmettre. Cf. `@/lib/ticket-template`.
   */
  template?: TicketTemplate;
};
export type PriorityOption = {
  id: string;
  name: string;
  color: string;
  order?: number;
};

/**
 * Composant applicatif du projet (page / composant réutilisable / service) :
 * la brique concernée par un ticket, qui CONTEXTUALISE la demande. Alimenté par
 * `getComponents`. Facultatif sur un ticket, et absent tant que le projet n'a
 * déclaré aucun composant.
 */
export type ComponentOption = {
  id: string;
  name: string;
  kind: ComponentKind;
  color: string;
  description?: string | null;
  order?: number;
  /** Module de rattachement, ou `null` pour un composant transverse. */
  module?: ModuleRef | null;
};

/**
 * Module fonctionnel du projet : un domaine à grosse maille (« Gestion des
 * utilisateurs ») qui regroupe plusieurs composants. Alimenté par `getModules`.
 */
export type ModuleOption = {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  order?: number;
};

// Valeurs sentinelles pour les <Select> (Radix interdit la valeur "").
export const NO_ASSIGNEE = "__none__";
export const NO_SPRINT = "__backlog__";
/** Sentinelle « aucune version » (Radix interdit la chaîne vide). */
export const NO_RELEASE = "__no_release__";
export const NO_COMPONENT = "__no_component__";
export const NO_MODULE = "__no_module__";
export const ALL = "__all__";

/**
 * Badge à teinte de couleur (pastille + nom), utilisé pour le type ET la
 * priorité d'un ticket. La couleur (hex arbitraire, propre au projet) est
 * appliquée en ligne : pastille pleine + bordure/fond teintés ; le texte reste
 * en `foreground` pour garantir le contraste en thème clair comme sombre.
 */
/**
 * `dense` : gabarit du TABLEAU KANBAN, où trois cartouches par carte se disputent
 * deux cent cinquante pixels. Deux points de moins de part et d'autre, et la
 * rangée tient sur une ligne au lieu de deux - à multiplier par le nombre de
 * cartes visibles, c'est une carte de plus par colonne.
 *
 * Le gabarit est PARTAGÉ par les trois cartouches - type, composant, module -
 * pour qu'ils aient la même hauteur, le même rayon et la même graisse. Chacun
 * avait le sien, et une même rangée en alignait de quatre tailles différentes.
 * La hauteur est FIXÉE plutôt que déduite du contenu : une icône ou un nom sur
 * deux lignes suffisait sinon à faire dépasser l'un d'eux.
 */
const DENSE_BADGE =
  "h-6 gap-1 px-1.5 py-0 text-[10px] leading-none whitespace-nowrap";
const ROOMY_BADGE = "gap-1.5 px-2 py-0.5 text-xs";
export function ColorBadge({
  name,
  color,
  dense = false,
}: {
  name: string;
  color: string;
  dense?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        dense ? DENSE_BADGE : ROOMY_BADGE,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span
        className={cn("shrink-0 rounded-full", dense ? "size-1.5" : "size-2")}
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {name}
    </span>
  );
}

/**
 * Icône associée à chaque nature de composant. Elle porte l'information en plus
 * de la couleur (la couleur seule ne suffit pas : contraste / daltonisme) : une
 * page (écran), une brique réutilisable et un service se distinguent d'un coup
 * d'œil, dans la liste comme sur une carte Kanban.
 */
export const COMPONENT_KIND_ICONS: Record<ComponentKind, LucideIcon> = {
  PAGE: FileText,
  SHARED: Blocks,
  SERVICE: Server,
};

/**
 * Badge d'un composant : icône de nature + nom, sur le même traitement visuel
 * que `ColorBadge` (bordure et fond teintés par la couleur du composant, texte
 * en `foreground` pour rester lisible en thème clair comme sombre).
 * `kindLabel` est le libellé traduit de la nature : il alimente l'infobulle et
 * un texte réservé aux lecteurs d'écran.
 */
export function ComponentBadge({
  name,
  kind,
  color,
  kindLabel,
  dense = false,
}: {
  name: string;
  kind: ComponentKind;
  color: string;
  kindLabel: string;
  dense?: boolean;
}) {
  const Icon = COMPONENT_KIND_ICONS[kind] ?? FileText;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border font-medium",
        dense ? DENSE_BADGE : ROOMY_BADGE,
      )}
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
      title={`${kindLabel} · ${name}`}
    >
      <Icon
        className={cn("shrink-0", dense ? "size-2.5" : "size-3")}
        style={{ color }}
        aria-hidden
      />
      {/* Nature annoncée aux lecteurs d'écran, sans ponctuation : celle-ci
          varie d'une langue à l'autre (l'espace insécable avant « : » est une
          règle française) et n'a pas à être codée en dur ici. */}
      <span className="sr-only">{kindLabel}</span>{" "}
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * Badge d'un module fonctionnel : pastille de couleur + nom. Volontairement plus
 * discret que `ComponentBadge` (pas de fond teinté), pour que la hiérarchie se
 * lise d'un coup d'œil quand les deux se côtoient : le module situe, le
 * composant précise.
 */
export function ModuleBadge({
  name,
  color,
  dense = false,
}: {
  name: string;
  color: string;
  dense?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border border-dashed font-medium text-muted-foreground",
        dense ? DENSE_BADGE : ROOMY_BADGE,
      )}
      title={name}
    >
      <span
        className={cn("shrink-0 rounded-full", dense ? "size-1.5" : "size-2")}
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** Puce de label colorée (pastille + nom). */
export function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {name}
    </span>
  );
}

/** Formate une taille d'octets en Ko/Mo lisible. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
