"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { createCommentAction } from "@/server/actions/comment.actions";
import { ticketMapOf, type TicketRef, type UserRef } from "@/lib/wiki-mentions";
import { useDict } from "@/i18n/provider";

/**
 * Formulaire d'ajout de commentaire, DU MEME TEXTE RICHE que la description
 * d'un ticket ou une page de wiki : on y discute de code, de traces d'erreur et
 * d'étapes de reproduction, que le texte brut aplatit. La citation « @ » y sert
 * autant qu'ailleurs, un commentaire renvoyant volontiers à un autre ticket.
 */
export function CommentForm({
  ticketId,
  projectKey,
  tickets,
  users = [],
}: {
  ticketId: string;
  projectKey: string;
  /** Tickets du projet : citations « @ » et résolution des liens de l'aperçu. */
  tickets: TicketRef[];
  /** Personnes citables par « @ ». Vide : seules les tâches sont proposées. */
  users?: UserRef[];
}) {
  const t = useDict();
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // L'éditeur riche est maître de son contenu une fois monté (cf.
  // wysiwyg-editor.tsx) : vider l'état ne le viderait pas à l'écran, et le
  // commentaire publié resterait affiché, prêt à être publié une seconde fois.
  // Le remonter est ce qui le vide vraiment.
  const [editorKey, setEditorKey] = useState(0);

  async function publish() {
    if (submitting) return;
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error(t.ticketDetail.emptyComment);
      return;
    }
    setSubmitting(true);
    const result = await createCommentAction(ticketId, trimmed);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBody("");
    setEditorKey((key) => key + 1);
    toast.success(t.ticketDetail.commentAdded);
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void publish();
      }}
      className="space-y-2"
    >
      <Label htmlFor="comment-body">{t.ticketDetail.addComment}</Label>
      <MarkdownEditor
        key={editorKey}
        id="comment-body"
        value={body}
        onChange={setBody}
        tickets={tickets}
        users={users}
        projectKey={projectKey}
        ticketMap={ticketMapOf(tickets)}
        placeholder={t.ticketDetail.commentPlaceholder}
        rows={5}
        disabled={submitting}
        onKeyDown={(event) => {
          // Publier sans lâcher le clavier, comme l'édition en place ailleurs.
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void publish();
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <span className="text-xs text-muted-foreground">
          {t.ticketDetail.commentShortcut}
        </span>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {t.ticketDetail.submitComment}
        </Button>
      </div>
    </form>
  );
}
