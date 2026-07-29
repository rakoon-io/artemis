"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { Button } from "@/components/ui/button";
import { InlineEdit } from "@/components/ui/inline-edit";
import { InlineSelect } from "@/components/ui/inline-select";
import { LabelMultiSelect } from "@/components/ticket/label-multi-select";
import {
  NO_ASSIGNEE,
  NO_COMPONENT,
  NO_MODULE,
  NO_SPRINT,
  type ComponentOption,
  type LabelOption,
  type Member,
  type ModuleOption,
  type PriorityOption,
  type SprintOption,
  type TicketTypeOption,
} from "@/components/ticket/ticket-fields";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Sentinelle pour les champs OBLIGATOIRES (type, priorité) : jamais proposée. */
const NO_TYPE = "__none__";

/**
 * Adaptateur CLIENT entre la page de détail (composant serveur) et la primitive
 * `InlineEdit`. La description a son propre composant (`ticket-description.tsx`),
 * l'édition Markdown ne se prêtant pas à une sauvegarde au blur.
 *
 * Raison d'être : une page serveur ne peut pas transmettre une fonction en prop
 * à un composant client. Ces enveloppes minces portent donc l'appel à la Server
 * Action et le rafraîchissement, et n'exposent au parent que des données sérialisables.
 *
 * L'autorisation reste imposée côté serveur par `updateTicketAction` : `canEdit`
 * ne fait que masquer l'affordance (« l'UI masque, le serveur impose »).
 */

/** Titre du ticket, éditable en place. Obligatoire, une seule ligne. */
export function TicketTitleInline({
  ticketId,
  value,
  canEdit,
}: {
  ticketId: string;
  value: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useDict();

  return (
    <InlineEdit
      value={value}
      field={t.ticketForm.titleLabel}
      required
      maxLength={200}
      disabled={!canEdit}
      className="text-2xl font-semibold tracking-tight"
      onSave={async (next) => {
        const res = await updateTicketAction({ id: ticketId, title: next });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(t.common.inline.saved);
        router.refresh();
        return true;
      }}
    />
  );
}

// ─── Champs à choix unique du panneau latéral ────────────────────────────────

/**
 * Fabrique le gestionnaire d'enregistrement d'un champ relationnel du ticket.
 * Toutes ces enveloppes font la même chose : appeler l'action, signaler l'échec,
 * rafraîchir. Factorisé pour qu'aucune ne puisse s'en écarter par inadvertance.
 */
function useFieldSaver(ticketId: string) {
  const router = useRouter();
  const t = useDict();
  return async function save(
    // `id` est fourni par l'enveloppe : l'appelant ne décrit que le champ modifié.
    patch: Omit<Parameters<typeof updateTicketAction>[0], "id">,
  ): Promise<boolean> {
    const res = await updateTicketAction({ ...patch, id: ticketId });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(t.common.inline.saved);
    router.refresh();
    return true;
  };
}

/** Assigné du ticket. `NO_ASSIGNEE` = personne. */
export function TicketAssigneeInline({
  ticketId,
  value,
  members,
  canEdit,
}: {
  ticketId: string;
  value: string | null;
  members: Member[];
  canEdit: boolean;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value ?? NO_ASSIGNEE}
      field={t.ticketForm.assigneeLabel}
      emptyValue={NO_ASSIGNEE}
      emptyLabel={t.ticketDetail.unassigned}
      disabled={!canEdit}
      options={members.map((m) => ({ value: m.id, label: m.name ?? m.email }))}
      onSave={(next) =>
        save({ assigneeId: next === NO_ASSIGNEE ? null : next })
      }
    />
  );
}

/** Sprint du ticket. `NO_SPRINT` = backlog. */
export function TicketSprintInline({
  ticketId,
  value,
  sprints,
  canEdit,
}: {
  ticketId: string;
  value: string | null;
  sprints: SprintOption[];
  canEdit: boolean;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value ?? NO_SPRINT}
      field={t.ticketForm.sprintLabel}
      emptyValue={NO_SPRINT}
      emptyLabel={t.ticketDetail.backlog}
      disabled={!canEdit}
      options={sprints.map((s) => ({ value: s.id, label: s.name }))}
      onSave={(next) => save({ sprintId: next === NO_SPRINT ? null : next })}
    />
  );
}

/** Composant concerné. Poser un composant fixe aussi le module (invariant serveur). */
export function TicketComponentInline({
  ticketId,
  value,
  components,
  canEdit,
  children,
}: {
  ticketId: string;
  value: string | null;
  components: ComponentOption[];
  canEdit: boolean;
  children?: ReactNode;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value ?? NO_COMPONENT}
      field={t.ticketForm.componentLabel}
      emptyValue={NO_COMPONENT}
      emptyLabel={t.ticketDetail.noComponent}
      disabled={!canEdit || components.length === 0}
      options={components.map((c) => ({
        value: c.id,
        label: c.name,
        color: c.color,
      }))}
      onSave={(next) =>
        save({ componentId: next === NO_COMPONENT ? null : next })
      }
    >
      {children}
    </InlineSelect>
  );
}

/**
 * Module du ticket. Non modifiable dès qu'un composant est choisi : le module
 * est alors DÉRIVÉ de celui-ci (cf. `@/lib/effective-module`). Le rendre
 * éditable donnerait l'illusion d'un choix que le serveur annulerait aussitôt.
 */
export function TicketModuleInline({
  ticketId,
  value,
  modules,
  hasComponent,
  canEdit,
  children,
}: {
  ticketId: string;
  value: string | null;
  modules: ModuleOption[];
  hasComponent: boolean;
  canEdit: boolean;
  children?: ReactNode;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value ?? NO_MODULE}
      field={t.ticketForm.moduleLabel}
      emptyValue={NO_MODULE}
      emptyLabel={t.ticketDetail.noModule}
      disabled={!canEdit || hasComponent || modules.length === 0}
      options={modules.map((m) => ({
        value: m.id,
        label: m.name,
        color: m.color,
      }))}
      onSave={(next) => save({ moduleId: next === NO_MODULE ? null : next })}
    >
      {children}
    </InlineSelect>
  );
}

/** Type du ticket (obligatoire : pas d'option « aucun » atteignable). */
export function TicketTypeInline({
  ticketId,
  value,
  types,
  canEdit,
  children,
}: {
  ticketId: string;
  value: string;
  types: TicketTypeOption[];
  canEdit: boolean;
  children?: ReactNode;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value}
      field={t.ticketForm.typeLabel}
      // Le type est obligatoire : la sentinelle ne correspond à aucune option et
      // n'est donc jamais proposée, mais `InlineSelect` en exige une.
      emptyValue={NO_TYPE}
      emptyLabel={t.ticketForm.selectPlaceholder}
      disabled={!canEdit}
      options={types.map((o) => ({ value: o.id, label: o.name, color: o.color }))}
      onSave={(next) => save({ typeId: next })}
    >
      {children}
    </InlineSelect>
  );
}

/** Priorité du ticket (obligatoire, même logique que le type). */
export function TicketPriorityInline({
  ticketId,
  value,
  priorities,
  canEdit,
  children,
}: {
  ticketId: string;
  value: string;
  priorities: PriorityOption[];
  canEdit: boolean;
  children?: ReactNode;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  return (
    <InlineSelect
      value={value}
      field={t.ticketForm.priorityLabel}
      emptyValue={NO_TYPE}
      emptyLabel={t.ticketForm.selectPlaceholder}
      disabled={!canEdit}
      options={priorities.map((o) => ({
        value: o.id,
        label: o.name,
        color: o.color,
      }))}
      onSave={(next) => save({ priorityId: next })}
    >
      {children}
    </InlineSelect>
  );
}

/**
 * Labels du ticket : choix MULTIPLE, donc validation explicite (contrairement
 * aux champs à choix unique, où sélectionner vaut décision).
 */
export function TicketLabelsInline({
  ticketId,
  value,
  labels,
  canEdit,
  children,
}: {
  ticketId: string;
  value: string[];
  labels: LabelOption[];
  canEdit: boolean;
  children?: ReactNode;
}) {
  const t = useDict();
  const save = useFieldSaver(ticketId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [pending, setPending] = useState(false);

  if (!canEdit || labels.length === 0) return <>{children}</>;

  if (editing) {
    return (
      <div className="mt-1 space-y-2">
        <LabelMultiSelect
          labels={labels}
          selected={draft}
          onChange={setDraft}
          disabled={pending}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
          >
            {t.common.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const ok = await save({ labelIds: draft });
              setPending(false);
              if (ok) setEditing(false);
            }}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      title={fmt(t.common.inline.editAria, { field: t.ticketForm.labelsLabel })}
      aria-label={fmt(t.common.inline.editAria, { field: t.ticketForm.labelsLabel })}
      className="group/inline -mx-2 mt-0.5 flex w-full items-start gap-1.5 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">{children}</span>
      <Pencil
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
        aria-hidden
      />
    </button>
  );
}
