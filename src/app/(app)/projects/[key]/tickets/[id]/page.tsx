import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { currentUser } from "@/lib/session";
import { can, canEditTicket } from "@/lib/policies";
import { formatDate, initials } from "@/lib/utils";
import {
  getLabels,
  getMembers,
  getSprints,
  getTicketDetail,
} from "@/server/queries";
import {
  formatBytes,
  LabelChip,
  PriorityBadge,
  TypeBadge,
} from "@/components/ticket/ticket-fields";
import { CommentForm } from "@/components/ticket/comment-form";
import { CommentList } from "@/components/ticket/comment-list";
import { DeleteTicketButton } from "@/components/ticket/delete-ticket-button";
import { EditTicketDialog } from "@/components/ticket/edit-ticket-dialog";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  const ticket = await getTicketDetail(id);
  if (!ticket) notFound();

  const user = await currentUser();
  const canEdit = canEditTicket(user, {
    reporterId: ticket.reporterId,
    assigneeId: ticket.assigneeId,
  });
  const canDelete = can(user, "delete_ticket");

  let editData:
    | {
        members: Awaited<ReturnType<typeof getMembers>>;
        sprints: Awaited<ReturnType<typeof getSprints>>;
        labels: Awaited<ReturnType<typeof getLabels>>;
      }
    | null = null;
  if (canEdit) {
    const [members, sprints, labels] = await Promise.all([
      getMembers(),
      getSprints(ticket.projectId),
      getLabels(ticket.projectId),
    ]);
    editData = { members, sprints, labels };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${key}/tickets`}>
          <ArrowLeft />
          Retour aux tickets
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-sm text-muted-foreground">{ticket.key}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ticket.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={ticket.type} />
            <PriorityBadge priority={ticket.priority} />
            <Badge variant="secondary">{ticket.column.name}</Badge>
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-2">
            {canEdit && editData && (
              <EditTicketDialog
                ticket={{
                  id: ticket.id,
                  title: ticket.title,
                  description: ticket.description,
                  type: ticket.type,
                  priority: ticket.priority,
                  assigneeId: ticket.assigneeId,
                  sprintId: ticket.sprintId,
                  labelIds: ticket.labels.map((l) => l.labelId),
                }}
                members={editData.members}
                sprints={editData.sprints}
                labels={editData.labels}
              />
            )}
            {canDelete && (
              <DeleteTicketButton
                ticketId={ticket.id}
                ticketKey={ticket.key}
                projectKey={key}
              />
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.description ? (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {ticket.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune description.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4" />
                Pièces jointes ({ticket.attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.attachments.length > 0 ? (
                <ul className="space-y-2">
                  {ticket.attachments.map((att) => (
                    <li key={att.id}>
                      <a
                        href={`/api/attachments/${att.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Download className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {att.filename}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatBytes(att.size)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune pièce jointe.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Commentaires ({ticket.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CommentList comments={ticket.comments} />
              <Separator />
              <CommentForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <MetaPerson
                label="Rapporteur"
                name={ticket.reporter.name ?? ticket.reporter.email}
              />
              <MetaPerson
                label="Assigné à"
                name={
                  ticket.assignee
                    ? (ticket.assignee.name ?? ticket.assignee.email)
                    : null
                }
              />
              <div>
                <p className="text-xs text-muted-foreground">Sprint</p>
                <p className="mt-0.5">{ticket.sprint?.name ?? "Backlog"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Labels</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ticket.labels.length > 0 ? (
                    ticket.labels.map((l) => (
                      <LabelChip
                        key={l.labelId}
                        name={l.label.name}
                        color={l.label.color}
                      />
                    ))
                  ) : (
                    <span className="text-muted-foreground">Aucun</span>
                  )}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Créé le</p>
                <p className="mt-0.5">{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mis à jour le</p>
                <p className="mt-0.5">{formatDate(ticket.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function MetaPerson({
  label,
  name,
}: {
  label: string;
  name: string | null;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      {name ? (
        <span className="mt-1 flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="text-[10px]">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{name}</span>
        </span>
      ) : (
        <p className="mt-0.5 text-muted-foreground">Non assigné</p>
      )}
    </div>
  );
}
