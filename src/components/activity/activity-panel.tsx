"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AtSign,
  ChevronDown,
  FileText,
  ListTodo,
  MessageSquare,
  Paperclip,
  Link2,
  Sparkles,
} from "lucide-react";
import type {
  ActivityRow,
  MentionRow,
  MyTicketRow,
  StageCounts,
} from "@/server/services/activity.service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "./progress-bar";
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";

/**
 * « MON ACTIVITÉ » : où j'en suis, qui m'a cité, ce qui a bougé.
 *
 * COMPACTE PAR DÉFAUT. La page d'accueil sert à choisir un projet ; cette zone
 * la renseigne, elle ne doit pas la repousser sous la ligne de flottaison. On
 * ouvre le détail quand on le cherche, et le plus récent vient toujours en tête.
 */
export function ActivityPanel({
  tickets,
  counts,
  mentions,
  recent,
  dateFormatter,
}: {
  tickets: MyTicketRow[];
  /** Totaux comptés en base : la liste est bornée, eux ne le sont pas. */
  counts: StageCounts;
  mentions: MentionRow[];
  recent: ActivityRow[];
  /** Dates déjà mises en forme côté serveur : une seule locale fait foi. */
  dateFormatter: Record<string, string>;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);

  const total = counts.total;

  // Les tâches achevées descendent : le fait est acquis, le reste est le travail.
  const ordered = [...tickets].sort((a, b) =>
    a.stage === "done" && b.stage !== "done"
      ? 1
      : b.stage === "done" && a.stage !== "done"
        ? -1
        : 0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-muted-foreground" />
              {t.activity.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? t.activity.assignedNone
                : fmt(
                    total > 1
                      ? t.activity.assignedOther
                      : t.activity.assignedOne,
                    { count: total },
                  )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mon-activite-detail" 
          >
            <ChevronDown
              className={open ? "rotate-180 transition-transform" : "transition-transform"}
            />
            {open ? t.activity.showLess : t.activity.showMore}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <ProgressBar counts={counts} />

        {open && (
          <div id="mon-activite-detail" className="space-y-6 border-t pt-5">
            <Section
              icon={<ListTodo className="size-4" />}
              title={t.activity.tabTickets}
              count={counts.total}
              empty={t.activity.ticketsEmpty}
              hint={counts.done > 0 ? t.activity.doneHidden : undefined}
            >
              <ul className="divide-y rounded-md border">
                {ordered.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/projects/${ticket.projectKey}/tickets/${ticket.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                    >
                      <span className="w-16 shrink-0 truncate font-mono text-xs text-muted-foreground">
                        {ticket.key}
                      </span>
                      <span
                        className={
                          ticket.stage === "done"
                            ? "flex-1 truncate text-muted-foreground line-through"
                            : "flex-1 truncate"
                        }
                      >
                        {ticket.title}
                      </span>
                      <Badge variant="outline" className="shrink-0 font-normal">
                        {ticket.columnName}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<AtSign className="size-4" />}
              title={t.activity.tabMentions}
              count={mentions.length}
              empty={t.activity.mentionsEmpty}
              hint={
                mentions.length > 0
                  ? fmt(t.activity.mentionsHint, { count: mentions.length })
                  : undefined
              }
            >
              <ul className="space-y-2">
                {mentions.map((mention) => (
                  <li key={mention.id}>
                    <Link
                      href={mention.href}
                      className="block rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
                        <span className="font-medium">
                          {mention.author ?? t.activity.someone}
                        </span>
                        <span className="text-muted-foreground">
                          {mention.source === "page"
                            ? t.activity.inPage
                            : mention.source === "comment"
                              ? t.activity.inComment
                              : t.activity.inTicket}
                        </span>
                        <span className="font-medium">{mention.target}</span>
                        <span className="text-xs text-muted-foreground">
                          {dateFormatter[`m:${mention.id}`]}
                        </span>
                      </p>
                      {mention.excerpt && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {mention.excerpt}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              icon={<MessageSquare className="size-4" />}
              title={t.activity.tabRecent}
              count={recent.length}
              empty={t.activity.recentEmpty}
            >
              <ul className="space-y-1.5">
                {recent.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={row.href}
                      className="flex flex-wrap items-baseline gap-x-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted/50"
                    >
                      <ActivityIcon kind={row.kind} />
                      <span className="font-medium">
                        {row.actor ?? t.activity.someone}
                      </span>
                      <span className="text-muted-foreground">
                        {verbOf(row.kind, t)}
                      </span>
                      <span className="font-medium">{row.target}</span>
                      {row.detail && (
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {row.detail}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {dateFormatter[`a:${row.id}`]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Verbe de l'action, tel qu'il s'enchaîne devant sa cible. */
function verbOf(
  kind: ActivityRow["kind"],
  t: ReturnType<typeof useDict>,
): string {
  switch (kind) {
    case "ticket":
      return t.activity.actionOpened;
    case "comment":
      return t.activity.actionCommented;
    case "page":
      return t.activity.actionEditedPage;
    case "pageCreated":
      return t.activity.actionCreatedPage;
    case "attachment":
      return t.activity.actionAttached;
    case "link":
      return t.activity.actionLinked;
  }
}

function ActivityIcon({ kind }: { kind: ActivityRow["kind"] }) {
  const className = "size-3.5 shrink-0 self-center text-muted-foreground";
  switch (kind) {
    case "comment":
      return <MessageSquare className={className} aria-hidden />;
    case "page":
    case "pageCreated":
      return <FileText className={className} aria-hidden />;
    case "attachment":
      return <Paperclip className={className} aria-hidden />;
    case "link":
      return <Link2 className={className} aria-hidden />;
    default:
      return <ListTodo className={className} aria-hidden />;
  }
}

/** Rubrique du volet déplié : un titre compté, et son état vide. */
function Section({
  icon,
  title,
  count,
  empty,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  empty: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="secondary">{count}</Badge>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {count === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        children
      )}
    </section>
  );
}
