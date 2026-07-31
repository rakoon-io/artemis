import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketTemplate } from "@prisma/client";
import { ArrowLeft, BookOpen, Download, Paperclip } from "lucide-react";
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
import { formatDateTime, initials } from "@/lib/utils";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getAssignableUsers,
  getComponents,
  getLabels,
  getModules,
  getReleases,
  getSprints,
  getTicketDetail,
  getTicketPriorities,
  getPagesDocumenting,
  getTicketRefs,
  getTicketTypes,
} from "@/server/queries";
import {
  ColorBadge,
  ComponentBadge,
  formatBytes,
  LabelChip,
  ModuleBadge,
} from "@/components/ticket/ticket-fields";
import { effectiveModule } from "@/lib/effective-module";
import { DocumentingPages } from "@/components/wiki/documenting-pages";
import { CommentForm } from "@/components/ticket/comment-form";
import { CommentList } from "@/components/ticket/comment-list";
import { DeleteTicketButton } from "@/components/ticket/delete-ticket-button";
import { EditTicketDialog } from "@/components/ticket/edit-ticket-dialog";
import {
  TicketAssigneeInline,
  TicketComponentInline,
  TicketLabelsInline,
  TicketModuleInline,
  TicketPriorityInline,
  TicketReleaseInline,
  TicketSprintInline,
  TicketTitleInline,
  TicketTypeInline,
} from "@/components/ticket/ticket-inline-fields";
import { TicketDescription } from "@/components/ticket/ticket-description";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  const t = await getDictionary();
  const user = await currentUser();
  const [project, ticket] = await Promise.all([
    getAccessibleProjectByKey(user, key),
    getTicketDetail(id),
  ]);
  // Accès refusé ou ticket d'un autre projet : indistinguable d'un ticket absent.
  if (!project || !ticket || ticket.projectId !== project.id) notFound();

  // Les images sont présentées en vignettes ; les autres fichiers en liste.
  const imageAttachments = ticket.attachments.filter((a) =>
    a.contentType.startsWith("image/"),
  );
  const fileAttachments = ticket.attachments.filter(
    (a) => !a.contentType.startsWith("image/"),
  );

  const canEdit = canEditTicket(user, {
    reporterId: ticket.reporterId,
    assigneeId: ticket.assigneeId,
  });
  const canDelete = can(user, "delete_ticket");

  // Module effectif : celui du composant s'il y en a un, sinon celui du ticket.
  const ticketModule = effectiveModule(ticket);

  // Références de tickets du projet : elles servent en LECTURE (résolution des
  // citations « RKN-123 » en liens) autant qu'en édition (autocomplétion « @ »),
  // donc chargées quels que soient les droits.
  const ticketRefs = await getTicketRefs(ticket.projectId);

  // DOCUMENTATION DE CE SUR QUOI L'ON TRAVAILLE. On part du module effectif et
  // du composant du ticket, et l'on remonte aux pages du wiki qui les décrivent.
  // C'est le paiement du lien page → catalogue : sans cette lecture inverse,
  // déclarer les sujets d'une page n'aurait servi qu'à orner cette page.
  const docs = await getPagesDocumenting({
    moduleIds: ticketModule ? [ticketModule.id] : [],
    componentIds: ticket.component ? [ticket.component.id] : [],
  });

  let editData:
    | {
        members: Awaited<ReturnType<typeof getAssignableUsers>>;
        sprints: Awaited<ReturnType<typeof getSprints>>;
        labels: Awaited<ReturnType<typeof getLabels>>;
        types: Awaited<ReturnType<typeof getTicketTypes>>;
        priorities: Awaited<ReturnType<typeof getTicketPriorities>>;
        components: Awaited<ReturnType<typeof getComponents>>;
        modules: Awaited<ReturnType<typeof getModules>>;
        releases: Awaited<ReturnType<typeof getReleases>>;
      }
    | null = null;
  if (canEdit) {
    const [
      members,
      sprints,
      labels,
      types,
      priorities,
      components,
      modules,
      releases,
    ] = await Promise.all([
        getAssignableUsers(ticket.projectId),
        getSprints(ticket.projectId),
        getLabels(ticket.projectId),
        getTicketTypes(ticket.projectId),
        getTicketPriorities(ticket.projectId),
        getComponents(ticket.projectId),
        getModules(ticket.projectId),
        getReleases(ticket.projectId),
      ]);
    editData = {
      members,
      sprints,
      labels,
      types,
      priorities,
      components,
      modules,
      releases,
    };
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/projects/${key}/tickets`}>
          <ArrowLeft />
          {t.ticketDetail.backToTickets}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-sm text-muted-foreground">{ticket.key}</p>
          {/* Titre éditable en place : le `<h1>` garde la sémantique, la
              primitive porte l'apparence et l'interaction. */}
          <h1>
            <TicketTitleInline
              ticketId={ticket.id}
              value={ticket.title}
              canEdit={canEdit}
            />
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex">
              <TicketTypeInline
                ticketId={ticket.id}
                value={ticket.type.id}
                types={editData?.types ?? []}
                canEdit={canEdit}
              >
                <ColorBadge name={ticket.type.name} color={ticket.type.color} />
              </TicketTypeInline>
            </span>
            <span className="inline-flex">
              <TicketPriorityInline
                ticketId={ticket.id}
                value={ticket.priority.id}
                priorities={editData?.priorities ?? []}
                canEdit={canEdit}
              >
                <ColorBadge
                  name={ticket.priority.name}
                  color={ticket.priority.color}
                />
              </TicketPriorityInline>
            </span>
            {ticketModule && (
              <ModuleBadge name={ticketModule.name} color={ticketModule.color} />
            )}
            {ticket.component && (
              <ComponentBadge
                name={ticket.component.name}
                kind={ticket.component.kind}
                color={ticket.component.color}
                kindLabel={t.taxonomy.componentKinds[ticket.component.kind]}
              />
            )}
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
                  typeId: ticket.type.id,
                  priorityId: ticket.priority.id,
                  componentId: ticket.componentId,
                  moduleId: ticket.moduleId,
                  assigneeId: ticket.assigneeId,
                  sprintId: ticket.sprintId,
                  labelIds: ticket.labels.map((l) => l.labelId),
                }}
                members={editData.members}
                sprints={editData.sprints}
                labels={editData.labels}
                types={editData.types}
                priorities={editData.priorities}
                components={editData.components}
                modules={editData.modules}
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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.ticketDetail.description}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TicketDescription
                ticketId={ticket.id}
                value={ticket.description}
                projectKey={project.key}
                tickets={ticketRefs}
                canEdit={canEdit}
                requiresReport={ticket.type.template === TicketTemplate.REPORT}
              />
            </CardContent>
          </Card>

          {/* La doc n'apparaît QUE s'il y en a : une carte « aucune
              documentation » sur chaque ticket serait un reproche permanent
              plutôt qu'un renseignement. */}
          {docs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="size-4" />
                  {t.wiki.subjects.ticketDocs}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentingPages pages={docs} projectKey={project.key} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Paperclip className="size-4" />
                {fmt(t.ticketDetail.attachments, {
                  count: ticket.attachments.length,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ticket.attachments.length > 0 ? (
                <div className="space-y-3">
                  {imageAttachments.length > 0 && (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {imageAttachments.map((att) => (
                        <li key={att.id}>
                          <a
                            href={`/api/attachments/${att.id}`}
                            target="_blank"
                            rel="noreferrer"
                            title={`${att.filename} (${formatBytes(att.size)})`}
                            className="group block overflow-hidden rounded-md border transition-colors hover:border-primary/50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/attachments/${att.id}`}
                              alt={att.filename}
                              loading="lazy"
                              className="aspect-square w-full bg-muted object-cover transition-transform group-hover:scale-105"
                            />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {fileAttachments.length > 0 && (
                    <ul className="space-y-2">
                      {fileAttachments.map((att) => (
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
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.ticketDetail.noAttachments}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {fmt(t.ticketDetail.comments, {
                  count: ticket.comments.length,
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <CommentList comments={ticket.comments} />
              <Separator />
              <CommentForm ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-16 lg:w-80 lg:shrink-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t.ticketDetail.details}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <MetaPerson
                label={t.ticketDetail.reporter}
                name={ticket.reporter.name ?? ticket.reporter.email}
              />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.ticketDetail.assignee}
                </p>
                <TicketAssigneeInline
                  ticketId={ticket.id}
                  value={ticket.assigneeId}
                  members={editData?.members ?? []}
                  canEdit={canEdit}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.ticketDetail.sprint}
                </p>
                <TicketSprintInline
                  ticketId={ticket.id}
                  value={ticket.sprintId}
                  sprints={editData?.sprints ?? []}
                  canEdit={canEdit}
                />
              </div>
              {/* VERSION : à côté du sprint, parce que c'est là qu'on se
                  demande « ça part quand ? » - et parce que les deux répondent
                  à des questions différentes. */}
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.releases.ticketField}
                </p>
                <TicketReleaseInline
                  ticketId={ticket.id}
                  value={ticket.releaseId}
                  releases={editData?.releases ?? []}
                  canEdit={canEdit}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.ticketDetail.module}
                </p>
                <TicketModuleInline
                  ticketId={ticket.id}
                  value={ticket.moduleId}
                  modules={editData?.modules ?? []}
                  hasComponent={ticket.componentId != null}
                  canEdit={canEdit}
                >
                  {ticketModule ? (
                    <ModuleBadge
                      name={ticketModule.name}
                      color={ticketModule.color}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {t.ticketDetail.noModule}
                    </span>
                  )}
                </TicketModuleInline>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.ticketDetail.component}
                </p>
                <TicketComponentInline
                  ticketId={ticket.id}
                  value={ticket.componentId}
                  components={editData?.components ?? []}
                  canEdit={canEdit}
                >
                  {ticket.component ? (
                    <ComponentBadge
                      name={ticket.component.name}
                      kind={ticket.component.kind}
                      color={ticket.component.color}
                      kindLabel={t.taxonomy.componentKinds[ticket.component.kind]}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {t.ticketDetail.noComponent}
                    </span>
                  )}
                </TicketComponentInline>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {t.ticketDetail.labels}
                </p>
                <TicketLabelsInline
                  ticketId={ticket.id}
                  value={ticket.labels.map((l) => l.labelId)}
                  labels={editData?.labels ?? []}
                  canEdit={canEdit}
                >
                  <span className="flex flex-wrap gap-1">
                    {ticket.labels.length > 0 ? (
                      ticket.labels.map((l) => (
                        <LabelChip
                          key={l.labelId}
                          name={l.label.name}
                          color={l.label.color}
                        />
                      ))
                    ) : (
                      <span className="text-muted-foreground">
                        {t.ticketDetail.noLabels}
                      </span>
                    )}
                  </span>
                </TicketLabelsInline>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.ticketDetail.createdAt}
                  </p>
                  <p className="mt-0.5">{formatDateTime(ticket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t.ticketDetail.updatedAt}
                  </p>
                  <p className="mt-0.5">{formatDateTime(ticket.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

async function MetaPerson({
  label,
  name,
}: {
  label: string;
  name: string | null;
}) {
  const t = await getDictionary();
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
        <p className="mt-0.5 text-muted-foreground">
          {t.ticketDetail.unassigned}
        </p>
      )}
    </div>
  );
}
