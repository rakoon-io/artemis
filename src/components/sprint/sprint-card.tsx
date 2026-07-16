"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarRange,
  Flag,
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
import { formatDate } from "@/lib/utils";

/** Ticket rattaché à un sprint (champs d'affichage). */
export interface SprintTicketRow {
  id: string;
  key: string;
  title: string;
  column: { name: string };
  type: { name: string; color: string };
  priority: { name: string; color: string };
  assignee: { name: string | null; email: string } | null;
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

function TicketRow({
  ticket,
  projectKey,
}: {
  ticket: SprintTicketRow;
  projectKey: string;
}) {
  return (
    <Link
      href={`/projects/${projectKey}/tickets/${ticket.id}`}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
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
      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: ticket.priority.color }}
          aria-hidden
        />
        {ticket.priority.name}
      </span>
      <Badge variant="outline" className="shrink-0 font-normal">
        {ticket.column.name}
      </Badge>
    </Link>
  );
}

/**
 * Carte d'un sprint / lot : en-tête (état, objectif, dates), liste de ses tickets,
 * et actions d'administration (Démarrer / Clôturer / Supprimer) réservées à l'admin.
 * Le serveur impose l'autorisation dans tous les cas.
 */
export function SprintCard({
  sprint,
  tickets,
  projectKey,
  isAdmin,
}: {
  sprint: Sprint;
  tickets: SprintTicketRow[];
  projectKey: string;
  isAdmin: boolean;
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
                <TicketRow ticket={ticket} projectKey={projectKey} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {isAdmin && (
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
      )}
    </Card>
  );
}
