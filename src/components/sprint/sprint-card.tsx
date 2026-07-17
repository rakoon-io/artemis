"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarRange,
  Check,
  Flag,
  FolderInput,
  Loader2,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { SprintState } from "@prisma/client";
import type { Sprint } from "@prisma/client";
import {
  deleteSprintAction,
  setSprintStateAction,
} from "@/server/actions/sprint.actions";
import { setTicketSprintAction } from "@/server/actions/ticket.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { formatDate } from "@/lib/utils";

/** Ticket rattaché à un sprint (ou au backlog), champs d'affichage. */
export interface SprintTicketRow {
  id: string;
  key: string;
  title: string;
  column: { name: string };
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
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  [SprintState.PLANNED]: { label: "Planifié", variant: "secondary" },
  [SprintState.ACTIVE]: { label: "Actif", variant: "default" },
  [SprintState.COMPLETED]: { label: "Terminé", variant: "outline" },
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
    toast.success(sprintId ? "Ticket ajouté au sprint." : "Ticket renvoyé au backlog.");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          aria-label="Déplacer le ticket vers un sprint"
          disabled={pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <FolderInput />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Déplacer vers
        </DropdownMenuLabel>
        {sprintOptions.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Aucun sprint. Créez-en un.
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
          <span className="flex-1">Backlog (aucun sprint)</span>
          {currentSprintId === null && (
            <Check className="size-4 shrink-0 text-primary" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Ligne d'un ticket dans la vue Sprints : lien + badges + menu de distribution. */
export function SprintTicketItem({
  ticket,
  projectKey,
  currentSprintId,
  sprintOptions,
}: {
  ticket: SprintTicketRow;
  projectKey: string;
  currentSprintId: string | null;
  sprintOptions: SprintChoice[];
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-sm">
      <Link
        href={`/projects/${projectKey}/tickets/${ticket.id}`}
        className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-primary"
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
      <Badge variant="outline" className="hidden shrink-0 font-normal sm:inline-flex">
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
}: {
  sprint: Sprint;
  tickets: SprintTicketRow[];
  projectKey: string;
  sprintOptions: SprintChoice[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = STATE_META[sprint.state];
  const isLot = !sprint.startDate && !sprint.endDate;

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
    toast.success(`Sprint « ${sprint.name} » supprimé.`);
    setDeleteOpen(false);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">{sprint.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {tickets.length} ticket{tickets.length > 1 ? "s" : ""}
            </Badge>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
        </div>
        {sprint.goal ? (
          <CardDescription>{sprint.goal}</CardDescription>
        ) : (
          <CardDescription className="italic">
            Sans objectif défini.
          </CardDescription>
        )}
        <p className="flex flex-wrap items-center gap-1.5 pt-1 text-sm text-muted-foreground">
          {isLot ? (
            <>
              <Flag className="size-4 shrink-0" />
              Lot, sans dates
            </>
          ) : (
            <>
              <CalendarRange className="size-4 shrink-0" />
              {formatDate(sprint.startDate)}
              <ArrowRight className="size-3 shrink-0" />
              {formatDate(sprint.endDate)}
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex-1">
        {tickets.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            Aucun ticket dans ce sprint.
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <SprintTicketItem
                  ticket={ticket}
                  projectKey={projectKey}
                  currentSprintId={sprint.id}
                  sprintOptions={sprintOptions}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="gap-2">
          {sprint.state === SprintState.PLANNED && (
            <Button
              type="button"
              size="sm"
              onClick={() =>
                changeState(
                  SprintState.ACTIVE,
                  `Sprint « ${sprint.name} » démarré.`,
                )
              }
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Play />}
              Démarrer
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
                  `Sprint « ${sprint.name} » clôturé.`,
                )
              }
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Flag />}
              Clôturer
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
                  `Sprint « ${sprint.name} » rouvert.`,
                )
              }
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />}
              Rouvrir
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
                aria-label={`Supprimer le sprint ${sprint.name}`}
              >
                <Trash2 />
                Supprimer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer « {sprint.name} » ?</DialogTitle>
                <DialogDescription>
                  Le sprint sera supprimé et ses tickets en seront détachés (ils
                  ne sont pas supprimés). Cette action est irréversible.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={pending}
                >
                  {pending && <Loader2 className="animate-spin" />}
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
    </Card>
  );
}
