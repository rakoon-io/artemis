"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarRange,
  Flag,
  Loader2,
  Play,
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

/** Métadonnées d'affichage par état de sprint. */
const STATE_META: Record<
  SprintState,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  [SprintState.PLANNED]: { label: "Planifié", variant: "secondary" },
  [SprintState.ACTIVE]: { label: "Actif", variant: "default" },
  [SprintState.COMPLETED]: { label: "Terminé", variant: "outline" },
};

/**
 * Carte d'un sprint / lot. Les actions d'état (Démarrer / Clôturer) et la
 * suppression ne sont rendues que pour un administrateur (`isAdmin`) — le
 * serveur impose de toute façon l'autorisation.
 */
export function SprintCard({
  sprint,
  isAdmin,
}: {
  sprint: Sprint;
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
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{sprint.name}</CardTitle>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        {sprint.goal ? (
          <CardDescription>{sprint.goal}</CardDescription>
        ) : (
          <CardDescription className="italic">
            Sans objectif défini.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {isLot ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flag className="size-4 shrink-0" />
            Lot — sans dates
          </p>
        ) : (
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarRange className="size-4 shrink-0" />
            {formatDate(sprint.startDate)}
            <ArrowRight className="size-3 shrink-0" />
            {formatDate(sprint.endDate)}
          </p>
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
