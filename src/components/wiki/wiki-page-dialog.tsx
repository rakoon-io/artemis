"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createWikiPageAction,
  updateWikiPageAction,
} from "@/server/actions/wiki.actions";

/**
 * Dialogue de création / édition d'une page de wiki. En création, redirige vers la
 * nouvelle page ; en édition, rafraîchit la page courante. Rappel dans l'aide : on
 * cite un ticket en écrivant sa clé (ex. RKN-3), qui devient un lien.
 */
export function WikiPageDialog({
  projectId,
  projectKey,
  page,
  trigger,
}: {
  projectId: string;
  projectKey: string;
  page?: { id: string; title: string; content: string };
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(page);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (next) {
      setTitle(page?.title ?? "");
      setContent(page?.content ?? "");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Le titre est requis.");
      return;
    }
    setSubmitting(true);
    const result = isEdit
      ? await updateWikiPageAction({ id: page!.id, title: trimmed, content })
      : await createWikiPageAction({ projectId, title: trimmed, content });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? "Page mise à jour." : "Page créée.");
    setOpen(false);
    if (isEdit) {
      router.refresh();
    } else {
      router.push(`/projects/${projectKey}/wiki?page=${result.data?.id ?? ""}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Éditer la page" : "Nouvelle page"}</DialogTitle>
          <DialogDescription>
            Citez un ticket en écrivant sa clé (ex. RKN-3) : elle devient un lien.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="wiki-title">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="wiki-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nom de la page"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wiki-content">Contenu</Label>
            <Textarea
              id="wiki-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Notes, procédures, décisions... Citez des tickets avec leur clé (RKN-3)."
              rows={14}
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer la page"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
