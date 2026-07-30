"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";
import {
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
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = STATE_META[sprint.state];

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
      </CardHeader>
      <CardContent className="flex-1">
        {tickets.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            {t.sprints.noTicketsInSprint}
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
                aria-label={fmt(t.sprints.deleteSprintAria, { name: sprint.name })}
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
