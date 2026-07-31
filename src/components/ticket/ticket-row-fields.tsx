"use client";

import {
  TicketAssigneeInline,
  TicketComponentInline,
  TicketLabelsInline,
  TicketModuleInline,
  TicketPriorityInline,
  TicketSprintInline,
  TicketStatusInline,
  TicketTypeInline,
} from "./ticket-inline-fields";
import {
  ColorBadge,
  ComponentBadge,
  LabelChip,
  ModuleBadge,
  type ColumnOption,
  type ComponentOption,
  type LabelOption,
  type Member,
  type ModuleOption,
  type PriorityOption,
  type SprintOption,
  type TicketRow,
  type TicketTypeOption,
} from "./ticket-fields";
import { effectiveModule } from "@/lib/effective-module";
import { useDict } from "@/i18n/provider";

/**
 * CELLULES MODIFIABLES d'une ligne de la liste des tickets.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES MÊMES CHAMPS QUE LA FICHE, PAS DES COUSINS
 *
 * Chaque cellule réutilise l'enveloppe déjà employée par le panneau latéral du
 * ticket. Rien n'est réécrit ici : ni l'appel au serveur, ni le rafraîchissement,
 * ni la façon de signaler une erreur. Deux surfaces qui modifient la même donnée
 * doivent le faire par le même chemin, sans quoi elles finissent par diverger -
 * l'une gérant un cas que l'autre ignore.
 *
 * Ce qui est AFFICHÉ est ce qui est MODIFIABLE : aucune commande n'apparaît pour
 * une donnée que la ligne ne montre pas, et aucune donnée montrée ne reste
 * inerte. La clef, le titre - qui est le lien vers la fiche - et la date de
 * modification font exception : ce ne sont pas des choix.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE DROIT SE DÉCIDE LIGNE PAR LIGNE
 *
 * `canEditTicket` - administrateur, rapporteur ou assigné - est évalué par le
 * tableau, qui est un composant SERVEUR : la règle reste celle des politiques,
 * elle n'est pas recopiée ici. Une liste montre les tickets de tout le monde ;
 * l'affordance ne doit paraître que sur les lignes qu'on peut effectivement
 * modifier. Le serveur impose la règle de toute façon - l'affichage ne fait que
 * ne pas mentir.
 */

export interface RowOptions {
  types: TicketTypeOption[];
  priorities: PriorityOption[];
  columns: ColumnOption[];
  members: Member[];
  sprints: SprintOption[];
  modules: ModuleOption[];
  components: ComponentOption[];
  labels: LabelOption[];
}

/**
 * Toutes les cellules modifiables d'une ligne, rendues telles que la lecture les
 * montrait - badges compris. `InlineSelect` accepte un rendu libre : le tableau
 * ne perd donc pas ses couleurs en devenant modifiable.
 */
export function RowType({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  return (
    <TicketTypeInline
      ticketId={ticket.id}
      value={ticket.type.id}
      types={options.types}
      canEdit={canEdit}
      compact
    >
      <ColorBadge name={ticket.type.name} color={ticket.type.color} />
    </TicketTypeInline>
  );
}

export function RowPriority({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  return (
    <TicketPriorityInline
      ticketId={ticket.id}
      value={ticket.priority.id}
      priorities={options.priorities}
      canEdit={canEdit}
      compact
    >
      <ColorBadge name={ticket.priority.name} color={ticket.priority.color} />
    </TicketPriorityInline>
  );
}

export function RowStatus({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  return (
    <TicketStatusInline
      ticketId={ticket.id}
      value={ticket.columnId}
      columns={options.columns}
      canEdit={canEdit}
      compact
    >
      <span className="whitespace-nowrap">{ticket.column.name}</span>
    </TicketStatusInline>
  );
}

export function RowAssignee({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  const t = useDict();
  const name = ticket.assignee?.name ?? ticket.assignee?.email ?? null;
  return (
    <TicketAssigneeInline
      ticketId={ticket.id}
      value={ticket.assigneeId}
      members={options.members}
      canEdit={canEdit}
      compact
    >
      <span className="block truncate whitespace-nowrap">
        {name ?? (
          <span className="text-muted-foreground">{t.ticketDetail.unassigned}</span>
        )}
      </span>
    </TicketAssigneeInline>
  );
}

export function RowSprint({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  const t = useDict();
  const sprint = options.sprints.find((s) => s.id === ticket.sprintId);
  return (
    <TicketSprintInline
      ticketId={ticket.id}
      value={ticket.sprintId}
      sprints={options.sprints}
      canEdit={canEdit}
      compact
    >
      <span className="block whitespace-nowrap">
        {sprint?.name ?? (
          <span className="text-muted-foreground">{t.ticketDetail.backlog}</span>
        )}
      </span>
    </TicketSprintInline>
  );
}

export function RowModule({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  const ticketModule = effectiveModule(ticket);
  return (
    <TicketModuleInline
      ticketId={ticket.id}
      value={ticket.moduleId}
      modules={options.modules}
      /* Le module d'un ticket qui a un COMPOSANT est celui du composant : le
         champ se fige de lui-même, plutôt que de laisser croire qu'on pourrait
         le contredire ici. */
      hasComponent={Boolean(ticket.componentId)}
      canEdit={canEdit}
      compact
    >
      {ticketModule ? (
        <ModuleBadge name={ticketModule.name} color={ticketModule.color} />
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </TicketModuleInline>
  );
}

export function RowComponent({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  const t = useDict();
  return (
    <TicketComponentInline
      ticketId={ticket.id}
      value={ticket.componentId}
      components={options.components}
      canEdit={canEdit}
      compact
    >
      {ticket.component ? (
        <ComponentBadge
          name={ticket.component.name}
          kind={ticket.component.kind}
          color={ticket.component.color}
          kindLabel={t.taxonomy.componentKinds[ticket.component.kind]}
        />
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </TicketComponentInline>
  );
}

export function RowLabels({
  ticket,
  options,
  canEdit,
}: {
  ticket: TicketRow;
  options: RowOptions;
  canEdit: boolean;
}) {
  return (
    <TicketLabelsInline
      ticketId={ticket.id}
      value={ticket.labels.map((l) => l.labelId)}
      labels={options.labels}
      canEdit={canEdit}
      compact
    >
      {ticket.labels.length > 0 ? (
        <span className="flex flex-wrap gap-1">
          {ticket.labels.map((l) => (
            <LabelChip key={l.labelId} name={l.label.name} color={l.label.color} />
          ))}
        </span>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </TicketLabelsInline>
  );
}
