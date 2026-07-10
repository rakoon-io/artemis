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
 * (import type uniquement — aucun code serveur n'atteint le bundle client).
 */

// Types dérivés des couches de lecture (queries).
export type Member = Awaited<ReturnType<typeof getMembers>>[number];
export type SprintOption = Awaited<ReturnType<typeof getSprints>>[number];
export type LabelOption = Awaited<ReturnType<typeof getLabels>>[number];
export type TicketRow = Awaited<ReturnType<typeof getTicketsList>>["items"][number];
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
};
export type PriorityOption = {
  id: string;
  name: string;
  color: string;
  order?: number;
};

// Valeurs sentinelles pour les <Select> (Radix interdit la valeur "").
export const NO_ASSIGNEE = "__none__";
export const NO_SPRINT = "__backlog__";
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
