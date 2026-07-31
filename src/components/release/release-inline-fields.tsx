"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineEdit } from "@/components/ui/inline-edit";
import { formatDate } from "@/lib/utils";
import { updateReleaseAction } from "@/server/actions/release.actions";
import { toDateInput } from "@/components/sprint/sprint-inline-fields";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * ÉDITION EN PLACE des champs d'une version : nom, notes, date visée. Même
 * grammaire que les sprints - on clique sur ce qu'on veut changer, là où on le
 * lit -, et la même primitive partagée pour le texte.
 *
 * L'ÉTAT reste hors de l'édition en place : livrer une version n'est pas
 * corriger une coquille, cela porte une intention et pose une date. Il a son
 * bouton, qui le dit.
 */

function useReleaseSaver(releaseId: string) {
  const router = useRouter();
  const t = useDict();
  return async function save(
    patch: Omit<Parameters<typeof updateReleaseAction>[0], "id">,
  ): Promise<boolean> {
    const res = await updateReleaseAction({ id: releaseId, ...patch });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(t.common.inline.saved);
    router.refresh();
    return true;
  };
}

/** Nom de la version - obligatoire, et unique dans le projet (imposé en base). */
export function ReleaseNameInline({
  releaseId,
  value,
}: {
  releaseId: string;
  value: string;
}) {
  const t = useDict();
  const save = useReleaseSaver(releaseId);
  return (
    <InlineEdit
      value={value}
      field={t.releases.nameLabel}
      required
      maxLength={60}
      className="text-lg font-semibold tracking-tight"
      onSave={(next) => save({ name: next })}
    />
  );
}

/** Notes de version : facultatives, multilignes. */
export function ReleaseNotesInline({
  releaseId,
  value,
}: {
  releaseId: string;
  value: string | null;
}) {
  const t = useDict();
  const save = useReleaseSaver(releaseId);
  return (
    <InlineEdit
      value={value ?? ""}
      field={t.releases.descriptionLabel}
      multiline
      maxLength={2000}
      emptyLabel={t.releases.descriptionPlaceholder}
      className="text-sm text-muted-foreground"
      onSave={(next) => save({ description: next || null })}
    />
  );
}

/**
 * Date VISÉE. Un champ propre plutôt que la primitive de texte : une date se
 * saisit avec un calendrier, pas au clavier caractère par caractère - et se
 * retire d'un geste, une date visée qu'on ne tient plus valant mieux effacée
 * qu'inexacte.
 */
export function ReleaseDueDateInline({
  releaseId,
  value,
}: {
  releaseId: string;
  value: Date | null;
}) {
  const t = useDict();
  const save = useReleaseSaver(releaseId);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState(() => toDateInput(value));

  if (editing) {
    return (
      <span className="flex items-center gap-1.5">
        <Input
          type="date"
          autoFocus
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          className="h-8 w-40"
          aria-label={t.releases.dueDateLabel}
        />
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const ok = await save({ dueDate: draft || null });
            setPending(false);
            if (ok) setEditing(false);
          }}
        >
          {pending && <Loader2 className="animate-spin" />}
          {t.common.save}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setDraft(toDateInput(value));
            setEditing(false);
          }}
        >
          <X />
        </Button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(toDateInput(value));
        setEditing(true);
      }}
      title={fmt(t.common.inline.editAria, { field: t.releases.dueDateLabel })}
      aria-label={fmt(t.common.inline.editAria, { field: t.releases.dueDateLabel })}
      className="group/inline flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {value ? (
        fmt(t.releases.dueOn, { date: formatDate(value) })
      ) : (
        <span className="italic">{t.releases.dueDateLabel}</span>
      )}
      <Pencil
        className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
        aria-hidden
      />
    </button>
  );
}
