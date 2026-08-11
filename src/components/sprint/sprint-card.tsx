"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";
import { countDone, isTicketDone, undoneFirst } from "@/lib/release-progress";
import {
  Check,
  Flag,
  FolderInput,
  GripVertical,
  Loader2,
  Play,
  Rocket,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { SprintState } from "@prisma/client";
import type { Sprint } from "@prisma/client";
import { canEditTicket, type PolicyUser } from "@/lib/policies";
import { cn } from "@/lib/utils";
import { TicketDropZone, useJustLeft, type DraggedTicket } from "./sprint-dnd";
import {
  deleteSprintAction,
  setSprintStateAction,
} from "@/server/actions/sprint.actions";
import { setTicketSprintAction } from "@/server/actions/ticket.actions";
import {
  SprintDatesInline,
  SprintGoalInline,
  SprintNameInline,
} from "./sprint-inline-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Ticket rattaché à un sprint (ou au backlog), champs d'affichage. */
export interface SprintTicketRow {
  id: string;
  key: string;
  title: string;
  /** Propriété du ticket : de quoi trancher qui peut le déplacer. */
  reporterId: string;
  assigneeId: string | null;
  /** `order` autant que `name` : le rang dit ce qui est achevé, le nom l'affiche. */
  column: { name: string; order: number };
  type: { name: string; color: string };
  priority: { name: string; color: string };
  assignee: { name: string | null; email: string } | null;
}

/** Sprint sélectionnable pour la distribution des tickets. */
export interface SprintChoice {
  id: string;
  name: string;
}

/** Métadonnées d'affichage par état de sprint. */
const STATE_META: Record<
  SprintState,
  {
    labelKey: "statePlanned" | "stateActive" | "stateCompleted";
    variant: "default" | "secondary" | "outline";
  }
> = {
  [SprintState.PLANNED]: { labelKey: "statePlanned", variant: "secondary" },
  [SprintState.ACTIVE]: { labelKey: "stateActive", variant: "default" },
  [SprintState.COMPLETED]: { labelKey: "stateCompleted", variant: "outline" },
};

/** Menu de déplacement d'un ticket vers un sprint (ou le backlog). */
function TicketSprintMenu({
  ticketId,
  currentSprintId,
  sprintOptions,
}: {
  ticketId: string;
  currentSprintId: string | null;
  sprintOptions: SprintChoice[];
}) {
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function move(sprintId: string | null) {
    if (pending || sprintId === currentSprintId) return;
    setPending(true);
    const res = await setTicketSprintAction(ticketId, sprintId);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      sprintId ? t.sprints.ticketAddedToSprint : t.sprints.ticketMovedToBacklog,
    );
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label={t.sprints.moveTicketAria}
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <FolderInput />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          {t.sprints.moveTo}
        </DropdownMenuLabel>
        {sprintOptions.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            {t.sprints.noSprintCreateOne}
          </p>
        )}
        {sprintOptions.map((s) => (
          <DropdownMenuItem
            key={s.id}
            onSelect={() => move(s.id)}
            className="gap-2"
          >
            <span className="flex-1 truncate">{s.name}</span>
            {currentSprintId === s.id && (
              <Check className="size-4 shrink-0 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => move(null)} className="gap-2">
          <span className="flex-1">{t.sprints.backlogNoSprint}</span>
          {currentSprintId === null && (
            <Check className="size-4 shrink-0 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Ligne d'un ticket dans la vue Sprints : poignée, lien, badges, menu.
 *
 * LA POIGNÉE PORTE LE DÉPLACEMENT, PAS LA LIGNE. Poser les écouteurs sur la
 * ligne entière rendrait le titre indéplaçable au clic - c'est la leçon déjà
 * apprise sur les cartes du tableau. Elle n'apparaît qu'à qui peut réellement
 * déplacer le ticket : le serveur refuserait les autres, l'afficher serait leur
 * promettre ce qu'ils n'obtiendront pas.
 */
export function SprintTicketItem({
  ticket,
  projectKey,
  currentSprintId,
  sprintOptions,
  done = false,
  currentUser,
}: {
  ticket: SprintTicketRow;
  projectKey: string;
  currentSprintId: string | null;
  sprintOptions: SprintChoice[];
  /**
   * Ticket achevé, tranché par l'APPELANT.
   *
   * Il connaît le rang de la dernière colonne, pas cette ligne : le lui faire
   * chercher aurait demandé de descendre la même donnée deux fois, et rien ne
   * garantirait que les deux chemins disent la même chose.
   */
  done?: boolean;
  currentUser: PolicyUser | null;
}) {
  const t = useDict();
  const canMove = canEditTicket(currentUser, ticket);
  const justLeft = useJustLeft(ticket.id, currentSprintId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled: !canMove,
    data: {
      key: ticket.key,
      title: ticket.title,
      sprintId: currentSprintId,
    } satisfies DraggedTicket,
  });

  // Déjà parti : sa ligne d'origine n'a plus lieu d'être, même si le serveur
  // n'a pas fini de répondre. Le `<li>` qui l'entoure se replie sur du vide
  // (cf. `[&>li:empty]:hidden` sur les listes).
  if (justLeft) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 text-sm",
        isDragging && "opacity-40",
      )}
    >
      {canMove && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          title={fmt(t.sprints.dragHandleAria, { ticket: ticket.key })}
          aria-label={fmt(t.sprints.dragHandleAria, { ticket: ticket.key })}
          className="-ml-1 shrink-0 cursor-grab touch-none rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" aria-hidden />
        </button>
      )}
      <Link
        href={`/projects/${projectKey}/tickets/${ticket.id}`}
        /* ACHEVÉ : barré et atténué. Le barré porte le sens, l'atténuation
           l'appuie - seule, elle se confondrait avec un texte secondaire. */
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-primary",
          done &&
            "text-muted-foreground line-through decoration-muted-foreground/60",
        )}
      >
        <span className="w-16 shrink-0 truncate font-mono text-xs text-muted-foreground">
          {ticket.key}
        </span>
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: ticket.type.color }}
          title={ticket.type.name}
          aria-hidden
        />
        <span className="flex-1 truncate">{ticket.title}</span>
      </Link>
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: ticket.priority.color }}
          aria-hidden
        />
        {ticket.priority.name}
      </span>
      <Badge
        variant="outline"
        className="hidden shrink-0 font-normal sm:inline-flex"
      >
        {ticket.column.name}
      </Badge>
      <TicketSprintMenu
        ticketId={ticket.id}
        currentSprintId={currentSprintId}
        sprintOptions={sprintOptions}
      />
    </div>
  );
}

/**
 * Carte d'un sprint / lot : en-tête (état, objectif, dates), liste de ses tickets
 * (chacun déplaçable vers un autre sprint ou le backlog), et actions de planification
 * (Démarrer / Clôturer / Rouvrir / Supprimer) ouvertes aux membres du projet. Le
 * serveur impose l'autorisation (accès au projet) dans tous les cas.
 */
export function SprintCard({
  sprint,
  tickets,
  projectKey,
  sprintOptions,
  lastColumnOrder,
  currentUser,
}: {
  /** Le sprint, avec la version dans laquelle son travail sort (facultative). */
  sprint: Sprint & { release?: { id: string; name: string } | null };
  tickets: SprintTicketRow[];
  projectKey: string;
  sprintOptions: SprintChoice[];
  /** Rang de la dernière colonne : ce qui l'atteint est achevé. */
  lastColumnOrder: number;
  currentUser: PolicyUser | null;
}) {
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = STATE_META[sprint.state];
  /**
   * CE QUI RESTE EN HAUT. L'achevé n'est pas masqué - il dit ce que l'itération
   * a produit -, mais il descend : c'est le reste qui est le travail.
   * Même règle et même fonction que la page Versions.
   */
  const ordonnes = undoneFirst(tickets, lastColumnOrder);
  const done = countDone(tickets, lastColumnOrder);

  async function changeState(next: SprintState, message: string) {
    setPending(true);
    const res = await setSprintStateAction(sprint.id, next);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(message);
    router.refresh();
  }

  async function handleDelete() {
    setPending(true);
    const res = await deleteSprintAction(sprint.id);
    if (!res.ok) {
      toast.error(res.error);
      setPending(false);
      return;
    }
    toast.success(fmt(t.sprints.toastDeleted, { name: sprint.name }));
    setDeleteOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <SprintNameInline
              sprintId={sprint.id}
              value={sprint.name}
              canEdit
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {tickets.length}{" "}
              {tickets.length > 1 ? t.sprints.ticketOther : t.sprints.ticketOne}
            </Badge>
            <Badge variant={meta.variant}>{t.sprints[meta.labelKey]}</Badge>
            {/* OÙ CE TRAVAIL SORT. Le rattachement se pose sur la page
                Versions ; ne l'afficher que là-bas obligerait à y aller pour
                savoir ce que devient une itération. */}
            {sprint.release && (
              <Badge variant="outline" className="gap-1 font-normal">
                <Rocket className="size-3" aria-hidden />
                {sprint.release.name}
              </Badge>
            )}
          </div>
        </div>
        {/* Nom, objectif et dates s'éditent EN PLACE, là où on les lit. Il n'y a
            volontairement plus de dialogue « Modifier » : deux chemins pour le
            même champ finissent toujours par diverger. L'état, lui, garde ses
            boutons dédiés dans le pied de carte. */}
        <SprintGoalInline sprintId={sprint.id} value={sprint.goal} canEdit />
        <div className="pt-1">
          <SprintDatesInline
            sprintId={sprint.id}
            startDate={sprint.startDate}
            endDate={sprint.endDate}
            canEdit
          />
        </div>
        {/* AVANCEMENT DE L'ITÉRATION, comme sur une version : la barre se
            compare d'un coup d'œil là où « 3 sur 12 » demande une division. Le
            chiffre reste, car « 1 sur 4 » et « 25 sur 100 » ont la même barre et
            ne représentent pas le même travail. */}
        {tickets.length > 0 && (
          <div className="space-y-1 pt-1">
            <SprintProgress done={done} total={tickets.length} />
            <p className="text-xs text-muted-foreground">
              {fmt(t.releases.progress, { done, total: tickets.length })}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        <TicketDropZone sprintId={sprint.id}>
          {/* `li:empty` : la ligne d'un ticket qui vient de partir ne rend rien ;
              son `<li>` doit se replier avec elle, sinon le trait de séparation
              resterait, seul, à la place du ticket. */}
          {tickets.length === 0 ? (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              {t.sprints.noTicketsInSprint}
            </p>
          ) : (
            <ul className="divide-y rounded-md border [&>li:empty]:hidden">
              {ordonnes.map((ticket) => (
                <li key={ticket.id}>
                  <SprintTicketItem
                    ticket={ticket}
                    projectKey={projectKey}
                    currentSprintId={sprint.id}
                    sprintOptions={sprintOptions}
                    done={isTicketDone(ticket, lastColumnOrder)}
                    currentUser={currentUser}
                  />
                </li>
              ))}
            </ul>
          )}
        </TicketDropZone>
      </CardContent>
      <CardFooter className="gap-2">
        {sprint.state === SprintState.PLANNED && (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              changeState(
                SprintState.ACTIVE,
                fmt(t.sprints.toastStarted, { name: sprint.name }),
              )
            }
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
            {t.sprints.startAction}
          </Button>
        )}
        {sprint.state === SprintState.ACTIVE && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              changeState(
                SprintState.COMPLETED,
                fmt(t.sprints.toastCompleted, { name: sprint.name }),
              )
            }
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Flag />}
            {t.sprints.closeAction}
          </Button>
        )}
        {sprint.state === SprintState.COMPLETED && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              changeState(
                SprintState.ACTIVE,
                fmt(t.sprints.toastReopened, { name: sprint.name }),
              )
            }
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            {t.sprints.reopen}
          </Button>
        )}
        <Dialog
          open={deleteOpen}
          onOpenChange={(next) => !pending && setDeleteOpen(next)}
        >
          <DialogTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto text-muted-foreground hover:text-destructive"
              aria-label={fmt(t.sprints.deleteSprintAria, {
                name: sprint.name,
              })}
            >
              <Trash2 />
              {t.common.delete}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {fmt(t.sprints.deleteTitle, { name: sprint.name })}
              </DialogTitle>
              <DialogDescription>
                {t.sprints.deleteDescription}
              </DialogDescription>
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
                onClick={handleDelete}
                disabled={pending}
              >
                {pending && <Loader2 className="animate-spin" />}
                {t.common.delete}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}

/**
 * Avancement d'un sprint, en une barre.
 *
 * Volontairement identique à celle d'une version : les deux répondent à la même
 * question et doivent se lire de la même façon. Deux dessins différents pour un
 * même sens obligeraient à réapprendre l'écran d'à côté.
 */
function SprintProgress({ done, total }: { done: number; total: number }) {
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
