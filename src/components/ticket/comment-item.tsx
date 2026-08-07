"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { WikiContent } from "@/components/wiki/wiki-content";
import type { TicketHint } from "@/components/wiki/ticket-hover-link";
import { updateCommentAction } from "@/server/actions/comment.actions";
import { initials } from "@/lib/utils";
import { ticketMapOf, type TicketRef } from "@/lib/wiki-mentions";
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";

/**
 * Un commentaire du fil : son corps en texte riche, et sa RETOUCHE sur place
 * pour qui l'a écrit. Le même éditeur que partout ailleurs sert à le corriger,
 * de sorte qu'un commentaire se relise et se répare de la même façon qu'il
 * s'écrit.
 */
export function CommentItem({
  comment,
  projectKey,
  tickets,
  ticketHints,
  canEdit,
  formattedDate,
}: {
  comment: { id: string; body: string; editedAt: Date | null };
  projectKey: string;
  tickets: TicketRef[];
  ticketHints: Record<string, TicketHint>;
  /** L'utilisateur courant est-il l'auteur ? Le serveur l'impose de son côté. */
  canEdit: boolean;
  /** Date déjà mise en forme côté serveur (une seule locale fait foi). */
  formattedDate: { author: string; created: string };
}) {
  const t = useDict();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [pending, setPending] = useState(false);

  // Réalignement sur la valeur serveur après rafraîchissement, jamais pendant
  // la saisie : ce que l'on est en train d'écrire ne se fait pas écraser.
  const [synced, setSynced] = useState(comment.body);
  if (comment.body !== synced && !editing && !pending) {
    setSynced(comment.body);
    setDraft(comment.body);
  }

  async function save() {
    const next = draft.trim();
    if (!next) {
      toast.error(t.ticketDetail.emptyComment);
      return;
    }
    if (next === comment.body.trim()) {
      setEditing(false);
      return;
    }
    setPending(true);
    const res = await updateCommentAction(comment.id, next);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error); // on reste en édition : la saisie n'est pas perdue
      return;
    }
    setSynced(next);
    setEditing(false);
    toast.success(t.common.inline.saved);
    router.refresh();
  }

  function cancel() {
    setDraft(comment.body);
    setEditing(false);
  }

  return (
    <li className="group/comment flex gap-3">
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">
          {initials(formattedDate.author)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{formattedDate.author}</span>
          <span className="text-xs text-muted-foreground">
            {formattedDate.created}
          </span>
          {comment.editedAt && (
            <span className="text-xs text-muted-foreground">
              {t.ticketDetail.commentEdited}
            </span>
          )}
          {canEdit && !editing && (
            // Dans l'en-tête, jamais au-dessus du texte : posé sur le corps du
            // commentaire, ce bouton en masquerait la fin au survol. Discret à
            // la lecture, il se montre au survol comme au focus - le parcours
            // au clavier reste donc complet.
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              aria-label={fmt(t.common.inline.editAria, {
                field: t.ticketDetail.commentField,
              })}
              className="ml-auto h-6 px-2 text-xs text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/comment:opacity-100"
            >
              <Pencil className="size-3" />
              {t.common.edit}
            </Button>
          )}
        </div>

        {editing ? (
          <div className="mt-2 space-y-2">
            <MarkdownEditor
              id={`comment-edit-${comment.id}`}
              value={draft}
              onChange={setDraft}
              tickets={tickets}
              projectKey={projectKey}
              ticketMap={ticketMapOf(tickets)}
              rows={5}
              disabled={pending}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancel();
                }
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
                disabled={pending}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void save()}
                disabled={pending}
              >
                {pending && <Loader2 className="animate-spin" />}
                {t.common.save}
              </Button>
            </div>
          </div>
        ) : (
          <WikiContent
            className="mt-1 text-sm"
            content={comment.body}
            projectKey={projectKey}
            ticketMap={ticketMapOf(tickets)}
            ticketHints={ticketHints}
          />
        )}
      </div>
    </li>
  );
}
