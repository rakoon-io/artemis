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
import { ContextField } from "@/components/ai/context-field";
import { ComponentSelect } from "./component-select";
import {
  NO_COMPONENT,
  type ComponentOption,
  type PriorityOption,
  type TicketTypeOption,
} from "./ticket-fields";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Brouillon éditable dans l'écran de revue (uid local pour clé stable). */
interface EditableDraft {
  uid: number;
  title: string;
  description: string;
  typeId: string;
  priorityId: string;
  /** Composant concerné : `NO_COMPONENT` tant qu'aucun n'est retenu. */
  componentId: string;
}

/**
 * Création de tickets depuis un texte libre collé (copier-coller), en deux temps :
 *  1. « Analyser » : le texte part vers une Server Action qui appelle Mistral
 *     côté serveur et renvoie des tickets SUGGÉRÉS (rien n'est encore créé).
 *  2. « Revue » : l'utilisateur relit, modifie (titre, description, type,
 *     priorité, composant), retire les indésirables, puis valide la création.
 *
 * La demande est CONTEXTUALISÉE de trois façons : le projet (nom, description),
 * son catalogue de composants et les consignes libres du champ « Contexte ». Les
 * deux premières sont assemblées côté serveur (cf. `ai-ticket.service`), si bien
 * que le modèle peut proposer lui-même le composant concerné par chaque ticket.
 *
 * Le composant n'est monté que si l'IA est configurée (cf. page Tickets) ; la
 * clé API Mistral reste strictement côté serveur.
 */
export function GenerateTicketsDialog({
  projectId,
  projectName,
  types,
  priorities,
  components,
}: {
  projectId: string;
  /** Nom du projet : sert à indiquer que son contexte est pris en compte. */
  projectName: string;
  types: TicketTypeOption[];
  priorities: PriorityOption[];
  /** Catalogue du projet ; vide = le champ « Composant » n'est pas rendu. */
  components: ComponentOption[];
}) {
  const router = useRouter();
  const t = useDict();
  const uidRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [drafts, setDrafts] = useState<EditableDraft[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [creating, setCreating] = useState(false);

  const busy = analyzing || creating;

  function reset() {
    setStep("input");
    setText("");
    setContext("");
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
      toast.error(t.aiTickets.pasteFirst);
      return;
    }

    setAnalyzing(true);
    const result = await suggestTicketsFromTextAction({
      projectId,
      text: trimmed,
      context: context.trim() ? context.trim() : null,
    });
    setAnalyzing(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const suggested = result.data?.tickets ?? [];
    if (suggested.length === 0) {
      toast.error(t.aiTickets.noneSuggested);
      return;
    }

    setDrafts(
      suggested.map((s) => ({
        uid: uidRef.current++,
        title: s.title,
        description: s.description ?? "",
        typeId: s.typeId ?? types[0]?.id ?? "",
        priorityId: s.priorityId ?? priorities[0]?.id ?? "",
        // Le composant n'a pas de valeur par défaut : sans rapprochement franc,
        // on préfère « aucun » plutôt qu'un rattachement arbitraire.
        componentId: s.componentId ?? NO_COMPONENT,
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
      toast.error(t.aiTickets.titleRequired);
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
        componentId: d.componentId === NO_COMPONENT ? null : d.componentId,
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
        ? fmt(t.aiTickets.createdOne, { key: created[0].key })
        : fmt(t.aiTickets.createdMany, { count: created.length }),
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
          {t.aiTickets.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {step === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.aiTickets.inputTitle}</DialogTitle>
              <DialogDescription>
                {t.aiTickets.inputDescription}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ai-ticket-text">
                  {t.aiTickets.textLabel}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="ai-ticket-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.aiTickets.textPlaceholder}
                  rows={12}
                  autoFocus
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t.aiTickets.textHint}
                </p>
              </div>

              <ContextField
                id="ai-ticket-context"
                value={context}
                onChange={setContext}
                label={t.aiTickets.contextLabel}
                rows={3}
                maxLength={4000}
                placeholder={t.aiTickets.contextPlaceholder}
                description={fmt(t.aiTickets.contextDescription, {
                  project: projectName,
                })}
                disabled={analyzing}
              />

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={analyzing}>
                    {t.common.cancel}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={analyzing}>
                  {analyzing && <Loader2 className="animate-spin" />}
                  {analyzing ? t.aiTickets.analyzing : t.aiTickets.analyze}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t.aiTickets.reviewTitle}</DialogTitle>
              <DialogDescription>
                {drafts.length > 0
                  ? t.aiTickets.reviewDescription
                  : t.aiTickets.reviewEmpty}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {drafts.map((draft, index) => (
                <Card key={draft.uid}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        {fmt(t.aiTickets.ticketIndex, { index: index + 1 })}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDraft(draft.uid)}
                        disabled={creating}
                        aria-label={t.aiTickets.removeAria}
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`draft-title-${draft.uid}`}>
                        {t.aiTickets.titleLabel}{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`draft-title-${draft.uid}`}
                        value={draft.title}
                        onChange={(e) =>
                          updateDraft(draft.uid, { title: e.target.value })
                        }
                        placeholder={t.aiTickets.titlePlaceholder}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`draft-desc-${draft.uid}`}>
                        {t.aiTickets.descriptionLabel}
                      </Label>
                      <Textarea
                        id={`draft-desc-${draft.uid}`}
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft(draft.uid, { description: e.target.value })
                        }
                        placeholder={t.aiTickets.descriptionPlaceholder}
                        rows={3}
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`draft-type-${draft.uid}`}>
                          {t.aiTickets.typeLabel}
                        </Label>
                        <Select
                          value={draft.typeId}
                          onValueChange={(v) => updateDraft(draft.uid, { typeId: v })}
                        >
                          <SelectTrigger
                            id={`draft-type-${draft.uid}`}
                            aria-label={t.aiTickets.typeLabel}
                          >
                            <SelectValue
                              placeholder={t.aiTickets.selectPlaceholder}
                            />
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
                        <Label htmlFor={`draft-priority-${draft.uid}`}>
                          {t.aiTickets.priorityLabel}
                        </Label>
                        <Select
                          value={draft.priorityId}
                          onValueChange={(v) =>
                            updateDraft(draft.uid, { priorityId: v })
                          }
                        >
                          <SelectTrigger
                            id={`draft-priority-${draft.uid}`}
                            aria-label={t.aiTickets.priorityLabel}
                          >
                            <SelectValue
                              placeholder={t.aiTickets.selectPlaceholder}
                            />
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

                      <ComponentSelect
                        id={`draft-component-${draft.uid}`}
                        components={components}
                        value={draft.componentId}
                        onChange={(v) =>
                          updateDraft(draft.uid, { componentId: v })
                        }
                        label={t.aiTickets.componentLabel}
                        emptyValue={NO_COMPONENT}
                        emptyLabel={t.aiTickets.noComponent}
                        disabled={creating}
                      />
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
                {t.aiTickets.back}
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || keepCount === 0}
              >
                {creating && <Loader2 className="animate-spin" />}
                {keepCount > 1
                  ? fmt(t.aiTickets.createMany, { count: keepCount })
                  : t.aiTickets.createOne}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
