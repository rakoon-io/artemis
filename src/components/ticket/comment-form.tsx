"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createCommentAction } from "@/server/actions/comment.actions";

/** Formulaire d'ajout de commentaire. */
export function CommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("Le commentaire est vide.");
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
    toast.success("Commentaire ajouté.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="comment-body">Ajouter un commentaire</Label>
      <Textarea
        id="comment-body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Votre message…"
        rows={3}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Commenter
        </Button>
      </div>
    </form>
  );
}
