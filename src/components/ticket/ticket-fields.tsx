import { TicketType, Priority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
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

// Valeurs sentinelles pour les <Select> (Radix interdit la valeur "").
export const NO_ASSIGNEE = "__none__";
export const NO_SPRINT = "__backlog__";
export const ALL = "__all__";

export const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: TicketType.BUG, label: "Bug" },
  { value: TicketType.FEATURE, label: "Fonctionnalité" },
  { value: TicketType.TASK, label: "Tâche" },
  { value: TicketType.CHORE, label: "Tâche technique" },
];

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: Priority.LOW, label: "Basse" },
  { value: Priority.MEDIUM, label: "Moyenne" },
  { value: Priority.HIGH, label: "Haute" },
  { value: Priority.URGENT, label: "Urgente" },
];

const TYPE_LABEL: Record<TicketType, string> = {
  BUG: "Bug",
  FEATURE: "Fonctionnalité",
  TASK: "Tâche",
  CHORE: "Tâche technique",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: "Basse",
  MEDIUM: "Moyenne",
  HIGH: "Haute",
  URGENT: "Urgente",
};

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "default",
  URGENT: "destructive",
};

export function typeLabel(type: TicketType): string {
  return TYPE_LABEL[type];
}

export function priorityLabel(priority: Priority): string {
  return PRIORITY_LABEL[priority];
}

export function TypeBadge({ type }: { type: TicketType }) {
  return <Badge variant="outline">{TYPE_LABEL[type]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
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
