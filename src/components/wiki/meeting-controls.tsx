"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMeetingAction } from "@/server/actions/wiki.actions";
import { useDict } from "@/i18n/provider";

/**
 * Déclare une page comme COMPTE RENDU DE RÉUNION, ou retire ce marqueur.
 *
 * Une seule donnée est demandée : la date. Elle sert à la fois de marqueur (une
 * page datée est un compte rendu) et de clef de tri du suivi. Le reste - thèmes,
 * points, actions - s'écrit dans la page elle-même, ce qui évite un formulaire
 * parallèle à maintenir en regard du Markdown.
 *
 * Retirer le marqueur ne touche jamais au contenu : le rappeler explicitement
 * sous le bouton évite l'hésitation au moment de cliquer.
 */

/** Format `YYYY-MM-DD` attendu par `<input type="date">`. */
function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function MeetingControls({
  pageId,
  meetingDate,
}: {
  pageId: string;
  /** Non nulle = la page est déjà un compte rendu. */
  meetingDate: Date | string | null;
}) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(toDateInput(meetingDate));
  const isMeeting = Boolean(meetingDate);

  async function apply(next: string | null, message: string) {
    setSubmitting(true);
    const res = await setMeetingAction({ pageId, meetingDate: next });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(message);
    setOpen(false);
    router.refresh();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) {
      toast.error(t.wiki.meeting.dateRequired);
      return;
    }
    void apply(date, t.wiki.meeting.marked);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        setOpen(next);
        // Réouvrir repart de la valeur du serveur : une saisie abandonnée ne doit
        // pas resurgir à la visite suivante.
        if (next) setDate(toDateInput(meetingDate));
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t.wiki.meeting.markAria}
        >
          <CalendarDays />
          {t.wiki.meeting.mark}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.wiki.meeting.dialogTitle}</DialogTitle>
          <DialogDescription>
            {t.wiki.meeting.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`meeting-date-${pageId}`}>
              {t.wiki.meeting.dateLabel}
            </Label>
            <Input
              id={`meeting-date-${pageId}`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">{t.wiki.meeting.help}</p>
          <DialogFooter className="gap-2 sm:justify-between">
            {isMeeting ? (
              <div className="flex flex-col items-start gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={submitting}
                  onClick={() => void apply(null, t.wiki.meeting.unmarked)}
                >
                  {t.wiki.meeting.unmark}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t.wiki.meeting.unmarkHint}
                </span>
              </div>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  {t.common.cancel}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                {isMeeting ? t.common.save : t.wiki.meeting.submit}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
