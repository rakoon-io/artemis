"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTicketsFromDraftsAction,
  suggestTicketsFromTextAction,
} from "@/server/actions/ai-ticket.actions";
import type { PriorityOption, TicketTypeOption } from "./ticket-fields";

/** Brouillon éditable dans l'écran de revue (uid local pour clé stable). */
interface EditableDraft {
  uid: number;
  title: string;
  description: string;
  typeId: string;
  priorityId: string;
}

/**
 * Création de tickets depuis un texte libre collé (copier-coller), en deux temps :
 *  1. « Analyser » : le texte part vers une Server Action qui appelle Mistral
 *     côté serveur et renvoie des tickets SUGGÉRÉS (rien n'est encore créé).
 *  2. « Revue » : l'utilisateur relit, modifie (titre, description, type,
 *     priorité), retire les indésirables, puis valide la création en lot.
 * Le composant n'est monté que si l'IA est configurée (cf. page Tickets) ; la
 * clé API Mistral reste strictement côté serveur.
 */
export function GenerateTicketsDialog({
  projectId,
  types,
  priorities,
}: {
  projectId: string;
  types: TicketTypeOption[];
  priorities: PriorityOption[];
}) {
  const router = useRouter();
  const uidRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);

  const busy = analyzing || creating;

  function reset() {
    setStep("input");
    setText("");
    setDrafts([]);
  }

  function onOpenChange(next: boolean) {
    if (busy) return;
    setOpen(next);
    if (!next) reset();
  }

  async function handleAnalyze(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error("Collez d'abord un texte à analyser.");
      return;
    }

    setAnalyzing(true);
    const result = await suggestTicketsFromTextAction({ projectId, text: trimmed });
    setAnalyzing(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const suggested = result.data?.tickets ?? [];
    if (suggested.length === 0) {
      toast.error("Aucun ticket n'a pu être suggéré depuis ce texte.");
      return;
    }

    setDrafts(
      suggested.map((s) => ({
        uid: uidRef.current++,
        title: s.title,
        description: s.description ?? "",
        typeId: s.typeId ?? types[0]?.id ?? "",
        priorityId: s.priorityId ?? priorities[0]?.id ?? "",
      })),
    );
    setStep("review");
  }

  function updateDraft(uid: number, patch: Partial<EditableDraft>) {
    setDrafts((prev) => prev.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));
  }

  function removeDraft(uid: number) {
    setDrafts((prev) => prev.filter((d) => d.uid !== uid));
  }

  async function handleCreate() {
    const valid = drafts.filter((d) => d.title.trim());
    if (valid.length === 0) {
      toast.error("Ajoutez un titre à au moins un ticket.");
      return;
    }

    setCreating(true);
    const result = await createTicketsFromDraftsAction({
      projectId,
      tickets: valid.map((d) => ({
        title: d.title.trim(),
        description: d.description.trim() ? d.description.trim() : null,
        typeId: d.typeId || null,
        priorityId: d.priorityId || null,
      })),
    });

    if (!result.ok) {
      toast.error(result.error);
      setCreating(false);
      return;
    }

    const created = result.data?.tickets ?? [];
    toast.success(
      created.length === 1
        ? `Ticket ${created[0].key} créé.`
        : `${created.length} tickets créés.`,
    );
    router.refresh();
    setCreating(false);
    setOpen(false);
    reset();
  }

  const keepCount = drafts.filter((d) => d.title.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Sparkles />
          Créer depuis un texte
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {step === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle>Créer des tickets depuis un texte</DialogTitle>
              <DialogDescription>
                Collez un compte-rendu, un e-mail ou une liste de tâches. L&apos;IA
                (Mistral) en propose un ou plusieurs tickets que vous relirez avant
                création.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-ticket-text">
                  Texte <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ai-ticket-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Collez ici le texte à transformer en tickets…"
                  rows={12}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Aucun ticket n&apos;est créé à cette étape : vous pourrez tout
                  ajuster ensuite.
                </p>
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={analyzing}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={analyzing}>
                  {analyzing && <Loader2 className="animate-spin" />}
                  Analyser le texte
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Revue des tickets suggérés</DialogTitle>
              <DialogDescription>
                {drafts.length > 0
                  ? "Relisez et modifiez chaque ticket, retirez ceux qui ne conviennent pas, puis validez."
                  : "Vous avez retiré tous les tickets. Revenez en arrière pour analyser un autre texte."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <Card key={draft.uid}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Ticket {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDraft(draft.uid)}
                        disabled={creating}
                        aria-label="Retirer ce ticket"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`draft-title-${draft.uid}`}>
                        Titre <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`draft-title-${draft.uid}`}
                        value={draft.title}
                        onChange={(e) =>
                          updateDraft(draft.uid, { title: e.target.value })
                        }
                        placeholder="Titre du ticket"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`draft-desc-${draft.uid}`}>Description</Label>
                      <Textarea
                        id={`draft-desc-${draft.uid}`}
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft(draft.uid, { description: e.target.value })
                        }
                        placeholder="Détails (facultatif)"
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`draft-type-${draft.uid}`}>Type</Label>
                        <Select
                          value={draft.typeId}
                          onValueChange={(v) => updateDraft(draft.uid, { typeId: v })}
                        >
                          <SelectTrigger id={`draft-type-${draft.uid}`} aria-label="Type">
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {types.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: o.color }}
                                    aria-hidden
                                  />
                                  {o.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`draft-priority-${draft.uid}`}>Priorité</Label>
                        <Select
                          value={draft.priorityId}
                          onValueChange={(v) =>
                            updateDraft(draft.uid, { priorityId: v })
                          }
                        >
                          <SelectTrigger
                            id={`draft-priority-${draft.uid}`}
                            aria-label="Priorité"
                          >
                            <SelectValue placeholder="Sélectionner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                <span className="flex items-center gap-2">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: o.color }}
                                    aria-hidden
                                  />
                                  {o.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("input")}
                disabled={creating}
              >
                <ArrowLeft />
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || keepCount === 0}
              >
                {creating && <Loader2 className="animate-spin" />}
                {keepCount > 1
                  ? `Créer ${keepCount} tickets`
                  : "Créer le ticket"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
