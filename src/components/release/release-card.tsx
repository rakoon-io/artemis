"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Repeat,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { ReleaseState } from "@prisma/client";
import {
  deleteReleaseAction,
  setReleaseStateAction,
  setSprintReleaseAction,
} from "@/server/actions/release.actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { countDone, isTicketDone, undoneFirst } from "@/lib/release-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn, formatDate, initials } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import {
  ReleaseDueDateInline,
  ReleaseNameInline,
  ReleaseNotesInline,
} from "./release-inline-fields";

/** Ticket d'une version, réduit à ce que la carte affiche. */
export interface ReleaseTicketRow {
  id: string;
  key: string;
  title: string;
  /**
   * D'où vient son appartenance : rangé à la main dans la version, ou hérité
   * d'un sprint qu'on y a rattaché. Affiché, parce que c'est la première
   * question devant une version qui contient plus que ce qu'on y a mis.
   */
  origin?: "DIRECT" | "SPRINT";
  fromSprint?: { id: string; name: string };
  column: { name: string; order: number };
  type: { name: string; color: string };
  priority: { name: string; color: string };
  assignee: { name: string | null; email: string } | null;
}

/**
 * AVANCEMENT D'UNE VERSION, en une barre.
 *
 * « 1 sur 4 terminés » se lit, mais ne se compare pas : côte à côte, six
 * versions en chiffres demandent six divisions mentales. Une barre se compare
 * d'un coup d'œil, ce qui est exactement ce qu'on vient faire sur cette page.
 *
 * Le compte chiffré RESTE à côté : la barre dit la proportion, le texte dit la
 * quantité - « 1 sur 4 » et « 25 sur 100 » ont la même barre et ne demandent pas
 * le même travail.
 */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const t = useDict();
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={fmt(t.releases.progress, { done, total })}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Sprint rattaché à une version, tel que la carte le montre. */
export interface ReleaseSprintRow {
  id: string;
  name: string;
  count: number;
}

/** Sprint du projet proposé au rattachement. */
export interface SprintOption {
  id: string;
  name: string;
  releaseId: string | null;
}

export interface ReleaseRow {
  id: string;
  name: string;
  description: string | null;
  state: ReleaseState;
  dueDate: Date | null;
  releasedAt: Date | null;
  tickets: ReleaseTicketRow[];
  sprints: ReleaseSprintRow[];
}

/**
 * UNE VERSION et son contenu.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'AVANCEMENT SE DÉDUIT, IL NE SE SAISIT PAS
 *
 * « Terminés » = les tickets de la DERNIÈRE colonne du tableau. Aucun champ à
 * tenir à jour, aucun pourcentage à corriger à la main : ce qui est fait est ce
 * qu'on a déplacé jusqu'au bout, et rien d'autre. Une version dont on
 * renseignerait l'avancement finirait par mentir dès la première semaine.
 */
export function ReleaseCard({
  release,
  projectKey,
  lastColumnOrder,
  sprintOptions = [],
  late = false,
}: {
  release: ReleaseRow;
  projectKey: string;
  /** Sprints du projet, pour en rattacher un. Vide = pas de sprint dans ce projet. */
  sprintOptions?: SprintOption[];
  /** Rang de la dernière colonne : ce qui l'atteint est achevé. */
  lastColumnOrder: number;
  /**
   * Date visée dépassée, tranché par le SERVEUR. Le calculer au rendu aurait
   * lu l'horloge pendant celui-ci : impur, et surtout différent d'un côté et de
   * l'autre de l'hydratation - le serveur et le navigateur ne sont jamais à la
   * même milliseconde.
   */
  late?: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const released = release.state === ReleaseState.RELEASED;
  const total = release.tickets.length;
  // Le même décompte que celui du service : un `filter` recopié à la main aurait
  // fini par diverger de la règle qu'il applique.
  const done = countDone(release.tickets, lastColumnOrder);
  /**
   * CE QUI RESTE EN HAUT. L'achevé descend sans disparaître : il dit ce que la
   * version a déjà emporté, et le masquer donnerait l'illusion d'un lot plus
   * petit qu'il n'est. Même règle et même fonction que la page Sprints.
   */
  const ordonnes = undoneFirst(release.tickets, lastColumnOrder);
  async function toggleState() {
    setPending(true);
    const res = await setReleaseStateAction(release.id, !released);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(released ? t.releases.unshipped : t.releases.shipped);
    router.refresh();
  }

  return (
    <Card className={cn(released && "bg-muted/30")}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <ReleaseNameInline releaseId={release.id} value={release.name} />
            <ReleaseNotesInline
              releaseId={release.id}
              value={release.description}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {total > 0 && (
              <Badge variant="secondary">
                {fmt(t.releases.progress, { done, total })}
              </Badge>
            )}
            <Badge variant={released ? "secondary" : "default"}>
              {released ? t.releases.stateReleased : t.releases.statePlanned}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {released ? (
              fmt(t.releases.releasedOn, {
                date: formatDate(release.releasedAt),
              })
            ) : (
              <ReleaseDueDateInline
                releaseId={release.id}
                value={release.dueDate}
              />
            )}
          </span>
          {late && (
            <Badge variant="destructive" className="text-[11px]">
              {t.releases.late}
            </Badge>
          )}
        </div>

        {/* CE QUE LA VERSION EMBARQUE PAR ITÉRATION. Placé avec la date et
            l'avancement, c'est-à-dire dans ce qui décrit la version, et non
            dans son contenu : un sprint rattaché explique le contenu, il n'en
            fait pas partie. */}
        <ReleaseSprints
          release={release}
          sprintOptions={sprintOptions}
          disabled={released}
        />

        {total > 0 && <ProgressBar done={done} total={total} />}
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            {t.releases.noTickets}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {ordonnes.map((ticket) => (
              <li
                key={ticket.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
              >
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                  {ticket.key}
                </span>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ticket.type.color }}
                  title={ticket.type.name}
                  aria-hidden
                />
                <Link
                  href={`/projects/${projectKey}/tickets/${ticket.id}`}
                  /* ACHEVÉ : barré et atténué. Le barré porte le sens,
                     l'atténuation l'appuie - seule, elle se confondrait avec un
                     texte secondaire. */
                  className={cn(
                    "min-w-0 flex-1 truncate hover:underline",
                    isTicketDone(ticket, lastColumnOrder) &&
                      "text-muted-foreground line-through decoration-muted-foreground/60",
                  )}
                >
                  {ticket.title}
                </Link>
                {/* Hérité d'un sprint : on le DIT, sinon on chercherait en vain
                    pourquoi ce ticket figure là sans y avoir été rangé. */}
                {ticket.origin === "SPRINT" && ticket.fromSprint && (
                  <span
                    className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex"
                    title={fmt(t.releases.fromSprint, {
                      name: ticket.fromSprint.name,
                    })}
                  >
                    <Repeat className="size-3" aria-hidden />
                    {ticket.fromSprint.name}
                  </span>
                )}
                {/* Priorité et assigné étaient DÉJÀ chargés par la requête, et
                    jetés au rendu. Ce sont pourtant les deux questions qu'on se
                    pose devant une version qui n'avance pas : qu'est-ce qui est
                    urgent, et qui s'en occupe. */}
                <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: ticket.priority.color }}
                    aria-hidden
                  />
                  {ticket.priority.name}
                </span>
                <Assignee assignee={ticket.assignee} />
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[11px]",
                    ticket.column.order >= lastColumnOrder &&
                      "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  {ticket.column.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter className="justify-between gap-2">
        <Button
          type="button"
          variant={released ? "outline" : "default"}
          size="sm"
          disabled={pending}
          onClick={() => void toggleState()}
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : released ? (
            <RotateCcw />
          ) : (
            <CheckCircle2 />
          )}
          {released ? t.releases.unship : t.releases.ship}
        </Button>

        <RemoveRelease release={release} />
      </CardFooter>
    </Card>
  );
}

/**
 * Qui s'en occupe, en une pastille. Les initiales plutôt que le nom : sur une
 * ligne déjà pleine, un nom complet chasserait le titre du ticket, qui est ce
 * qu'on lit. Le nom reste au survol, et pour les technologies d'assistance.
 */
function Assignee({
  assignee,
}: {
  assignee: { name: string | null; email: string } | null;
}) {
  const t = useDict();
  if (!assignee) {
    return <span className="sr-only">{t.ticketDetail.unassigned}</span>;
  }
  const label = assignee.name ?? assignee.email;
  return (
    <Avatar className="size-5 shrink-0" title={label}>
      <AvatarFallback className="text-[9px]">{initials(label)}</AvatarFallback>
      <span className="sr-only">{label}</span>
    </Avatar>
  );
}

/**
 * Suppression, avec confirmation. Le dialogue DIT ce qu'il advient des tickets :
 * ils restent, ils perdent seulement leur version - c'est la question qu'on se
 * pose avant de cliquer.
 */
function RemoveRelease({ release }: { release: ReleaseRow }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const res = await deleteReleaseAction(release.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.releases.removed);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Trash2 />
          {t.releases.remove}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fmt(t.releases.removeTitle, { name: release.name })}
          </DialogTitle>
          <DialogDescription>{t.releases.removeDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void remove()}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * SPRINTS RATTACHÉS à une version : les voir, en ajouter, en retirer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CETTE INFORMATION EST MONTRÉE, ET PAS SEULEMENT UTILISÉE
 *
 * Rattacher un sprint fait entrer ses tickets dans la version sans qu'on les y
 * range. Sans marque visible, la version se remplirait de lignes que personne
 * n'y a mises et que personne ne saurait retirer. Le bandeau répond donc à deux
 * questions d'un coup : d'où vient ce contenu, et comment le défaire.
 *
 * Une version LIVRÉE ne se remanie plus : le rattachement y est en lecture
 * seule, comme le reste de son contenu.
 */
function ReleaseSprints({
  release,
  sprintOptions,
  disabled,
}: {
  release: ReleaseRow;
  sprintOptions: SprintOption[];
  disabled: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  // Un sprint déjà rattaché AILLEURS n'est pas proposé : le choisir ici
  // reviendrait à le retirer d'une autre version sans le dire (le serveur le
  // refuse de toute façon, cf. `sprintAssignable`).
  const libres = sprintOptions.filter((s) => s.releaseId == null);

  async function set(
    sprintId: string,
    releaseId: string | null,
    message: string,
  ) {
    setPending(sprintId);
    const res = await setSprintReleaseAction(sprintId, releaseId);
    setPending(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(message);
    router.refresh();
  }

  if (disabled && release.sprints.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Repeat className="size-4 shrink-0" aria-hidden />
        {t.releases.sprints}
      </span>

      {release.sprints.length === 0 ? (
        <span className="text-xs text-muted-foreground">
          {t.releases.noSprint}
        </span>
      ) : (
        release.sprints.map((sprint) => (
          <Badge key={sprint.id} variant="secondary" className="gap-1 pr-1">
            {sprint.name}
            <span className="text-muted-foreground">· {sprint.count}</span>
            {!disabled && (
              <button
                type="button"
                disabled={pending === sprint.id}
                onClick={() =>
                  void set(sprint.id, null, t.releases.sprintDetached)
                }
                title={fmt(t.releases.detachSprint, { name: sprint.name })}
                aria-label={fmt(t.releases.detachSprint, { name: sprint.name })}
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
              >
                {pending === sprint.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </button>
            )}
          </Badge>
        ))
      )}

      {!disabled && libres.length > 0 && (
        <Select
          // Jamais de valeur retenue : ce sélecteur est un GESTE (« rattacher
          // celui-ci »), pas un champ dont on lirait l'état. Le rattachement
          // effectué, la liste des pastilles ci-dessus fait foi.
          value=""
          onValueChange={(id) =>
            void set(id, release.id, t.releases.sprintAttached)
          }
        >
          <SelectTrigger
            className="h-7 w-auto gap-1 text-xs"
            aria-label={t.releases.attachSprint}
          >
            <SelectValue placeholder={t.releases.attachSprint} />
          </SelectTrigger>
          <SelectContent>
            {libres.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
