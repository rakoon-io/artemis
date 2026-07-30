"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarPlus, Loader2 } from "lucide-react";
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
import { createMeetingPageAction } from "@/server/actions/wiki.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import { formatDate } from "@/lib/utils";

/**
 * OUVRIR UNE RÉUNION en un geste, à côté de « Nouvelle page ».
 *
 * Le chemin d'avant demandait quatre décisions à la suite : créer une page,
 * l'enregistrer, la déclarer compte rendu, choisir sa date. Quatre écrans pour
 * un besoin qui n'en mérite aucun - on sait déjà, en cliquant, que c'est une
 * réunion et quel jour elle a lieu.
 *
 * Ce que le modèle pose :
 *  - la DATE, qui fait le marqueur, le tri du suivi et le début de l'adresse ;
 *  - un TITRE proposé à partir de cette date, qui reste modifiable ;
 *  - un EN-TÊTE amorcé - présents, ordre du jour -, les deux lignes qu'aucun
 *    compte rendu n'omet.
 *
 * Ce qu'il ne pose PAS : de thèmes d'exemple. Un « Premier thème » à effacer
 * coûte plus qu'il ne rend. La page s'ouvre directement dans l'éditeur de
 * points, dont l'état vide propose d'ajouter un thème - ou, si l'IA est
 * configurée, de construire le compte rendu depuis des notes brutes.
 */

/** Aujourd'hui au format `AAAA-MM-JJ`, dans le fuseau de qui saisit. */
function today(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function NewMeetingButton({
  projectId,
  projectKey,
  parentId = null,
}: {
  projectId: string;
  projectKey: string;
  /**
   * Racine de la section « Réunions », quand elle existe. C'est ici que LA
   * SECTION PROPOSE : le compte rendu naît rangé, sans qu'on ait à y penser.
   * Absente, la page naît à la racine - un wiki sans sections continue de
   * fonctionner, il est simplement moins rangé.
   */
  parentId?: string | null;
}) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [date, setDate] = useState(today);
  const [title, setTitle] = useState("");
  /**
   * Le titre suit la date TANT QU'IL N'A PAS ÉTÉ ÉCRIT À LA MAIN. Sans ce
   * garde-fou, corriger la date après avoir nommé la réunion effacerait le nom.
   */
  const [titleTouched, setTitleTouched] = useState(false);

  const suggested = fmt(t.wiki.meeting.defaultTitle, { date: formatDate(date) });
  const effectiveTitle = titleTouched && title.trim() ? title.trim() : suggested;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!date) {
      toast.error(t.wiki.meeting.dateRequired);
      return;
    }
    setPending(true);
    const res = await createMeetingPageAction({
      projectId,
      title: effectiveTitle,
      // Le gabarit est composé ICI, depuis le dictionnaire : la langue de
      // l'en-tête est celle de qui ouvre la réunion, pas celle du serveur.
      content: t.wiki.meeting.templatePreamble,
      meetingDate: date,
      parentId,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.meeting.created);
    setOpen(false);
    // `edit=1` : on arrive dans l'éditeur de points, pas devant une page vide
    // qu'il faudrait encore songer à modifier.
    //
    // Pas de `router.refresh()` derrière : il relit la route COURANTE et annule
    // la navigation à peine demandée - on restait sur l'index du wiki, la page
    // créée mais jamais ouverte. La page étant rendue côté serveur, la
    // navigation suffit à la charger fraîche.
    const handle = res.data?.slug ?? res.data?.id;
    router.push(`/projects/${projectKey}/wiki?page=${handle}&edit=1`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarPlus />
          {t.wiki.meeting.newMeeting}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.wiki.meeting.newMeeting}</DialogTitle>
          <DialogDescription>
            {t.wiki.meeting.newMeetingDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-meeting-date">{t.wiki.meeting.dateLabel}</Label>
            <Input
              id="new-meeting-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={pending}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-meeting-title">{t.wiki.form.titleLabel}</Label>
            <Input
              id="new-meeting-title"
              value={titleTouched ? title : suggested}
              onChange={(event) => {
                setTitleTouched(true);
                setTitle(event.target.value);
              }}
              maxLength={200}
              disabled={pending}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                {t.common.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {t.wiki.meeting.newMeetingSubmit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
