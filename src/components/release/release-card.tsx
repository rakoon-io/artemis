"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { ReleaseState } from "@prisma/client";
import {
  deleteReleaseAction,
  setReleaseStateAction,
} from "@/server/actions/release.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
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
import { cn, formatDate } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import {
  ReleaseDueDateInline,
  ReleaseNameInline,
  ReleaseNotesInline,
} from "./release-inline-fields";

/** Ticket rattaché à une version, réduit à ce que la carte affiche. */
export interface ReleaseTicketRow {
  id: string;
  key: string;
  title: string;
  column: { name: string; order: number };
  type: { name: string; color: string };
  priority: { name: string; color: string };
  assignee: { name: string | null; email: string } | null;
}

export interface ReleaseRow {
  id: string;
  name: string;
  description: string | null;
  state: ReleaseState;
  dueDate: Date | null;
  releasedAt: Date | null;
  tickets: ReleaseTicketRow[];
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
  late = false,
}: {
  release: ReleaseRow;
  projectKey: string;
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
  const done = release.tickets.filter(
    (ticket) => ticket.column.order >= lastColumnOrder,
  ).length;
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
              fmt(t.releases.releasedOn, { date: formatDate(release.releasedAt) })
            ) : (
              <ReleaseDueDateInline releaseId={release.id} value={release.dueDate} />
            )}
          </span>
          {late && (
            <Badge variant="destructive" className="text-[11px]">
              {t.releases.late}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {total === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
            {t.releases.noTickets}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {release.tickets.map((ticket) => (
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
                  aria-hidden
                />
                <Link
                  href={`/projects/${projectKey}/tickets/${ticket.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  {ticket.title}
                </Link>
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
        <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
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
