import type { ComponentKind, TicketTemplate } from "@prisma/client";
import { Blocks, FileText, Server, type LucideIcon } from "lucide-react";
import type { ModuleRef } from "@/lib/effective-module";
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
export const NO_COMPONENT = "__no_component__";
export const NO_MODULE = "__no_module__";
export const ALL = "__all__";

/**
 * Badge à teinte de couleur (pastille + nom), utilisé pour le type ET la
 * priorité d'un ticket. La couleur (hex arbitraire, propre au projet) est
 * appliquée en ligne : pastille pleine + bordure/fond teintés ; le texte reste
 * en `foreground` pour garantir le contraste en thème clair comme sombre.
 */
export function ColorBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      <span
        className="size-2 shrink-0 rounded-full"
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
}: {
  name: string;
  kind: ComponentKind;
  color: string;
  kindLabel: string;
}) {
  const Icon = COMPONENT_KIND_ICONS[kind] ?? FileText;
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium"
      style={{
        borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
      title={`${kindLabel} · ${name}`}
    >
      <Icon className="size-3 shrink-0" style={{ color }} aria-hidden />
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
export function ModuleBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground"
      title={name}
    >
      <span
        className="size-2 shrink-0 rounded-full"
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
