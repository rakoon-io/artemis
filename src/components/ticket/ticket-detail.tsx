import Link from "next/link";
import { notFound } from "next/navigation";
import { TicketTemplate } from "@prisma/client";
import { ArrowLeft, BookOpen, Link2, Paperclip } from "lucide-react";
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
import { DialogTitle } from "@/components/ui/dialog";
import { currentUser } from "@/lib/session";
import {
  can,
  canAttachToTicket,
  canEditTicket,
  canRemoveAttachment,
} from "@/lib/policies";
import { cn, formatDateTime, initials } from "@/lib/utils";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getAssignableUsers,
  getComponents,
  getLabels,
  getModules,
  getReleases,
  getSprints,
  getLinkCandidates,
  getTicketDetail,
  getTicketLinks,
  getTicketPriorities,
  getPagesDocumenting,
  getTicketRefs,
  getTicketTypes,
} from "@/server/queries";
import {
  ColorBadge,
  ComponentBadge,
  LabelChip,
  ModuleBadge,
} from "@/components/ticket/ticket-fields";
import { effectiveModule } from "@/lib/effective-module";
import { DocumentingPages } from "@/components/wiki/documenting-pages";
import { CommentForm } from "@/components/ticket/comment-form";
import { CommentList } from "@/components/ticket/comment-list";
import { DeleteTicketButton } from "@/components/ticket/delete-ticket-button";
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
import { TicketAttachments } from "@/components/ticket/ticket-attachments";
import { TicketLinks } from "@/components/ticket/ticket-links";
import { resolveLinks } from "@/lib/ticket-links";
import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";

/**
 * FICHE D'UN TICKET - le contenu, sans la fenêtre.
 *
 * Le même composant sert la page pleine et la modale ouverte depuis la liste ou
 * le tableau. Deux implémentations auraient divergé au premier champ ajouté :
 * c'est déjà arrivé aux formulaires de ce projet, et la fiche compte quarante
 * champs.
 *
 * Seul l'ENCADREMENT change - largeur, retour à la liste, titre accessible -,
 * jamais ce qui est montré : on ne consulte pas un ticket au rabais sous
 * prétexte qu'on l'a ouvert d'un clic.
 */
export async function TicketDetail({
  projectKey: key,
  ticketId: id,
  chrome = "page",
}: {
  projectKey: string;
  ticketId: string;
  /**
   * `page` : la fiche occupe la page, précédée du retour à la liste.
   * `modal` : la boîte de dialogue impose déjà sa largeur et sa fermeture ;
   * un « retour à la liste » y désignerait ce qu'on n'a jamais quitté.
   */
  chrome?: "page" | "modal";
}) {
  const t = await getDictionary();
  const user = await currentUser();
  const [project, ticket] = await Promise.all([
    getAccessibleProjectByKey(user, key),
    getTicketDetail(id),
  ]);
  // Accès refusé ou ticket d'un autre projet : indistinguable d'un ticket absent.
  if (!project || !ticket || ticket.projectId !== project.id) notFound();

  /**
   * De qui relève ce ticket. Nommé plutôt qu'écrit deux fois sur place : les
   * pièces jointes s'en servent aussi, et deux littéraux auraient fini par
   * différer d'un champ.
   */
  const ownership = {
    reporterId: ticket.reporterId,
    assigneeId: ticket.assigneeId,
  };
  const canEdit = canEditTicket(user, ownership);
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

  // TICKETS LIÉS. Les liens se lisent des deux bouts ; `resolveLinks` les
  // retourne déjà vus depuis CE ticket, l'affichage n'a donc pas à savoir de
  // quel côté la ligne a été écrite. Les candidats ne sont chargés que si l'on
  // peut lier : les proposer à qui ne peut rien en faire serait une liste morte.
  const [storedLinks, linkCandidates] = await Promise.all([
    getTicketLinks(ticket.id),
    canEdit ? getLinkCandidates(ticket.projectId, ticket.id) : [],
  ]);
  const links = resolveLinks(ticket.id, storedLinks).map((l) => ({
    id: l.id,
    labelKey: l.labelKey,
    blocking: l.blocking,
    other: {
      id: l.other.id,
      key: l.other.key,
      title: l.other.title,
      columnName: l.other.column.name,
    },
  }));

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

  const inModal = chrome === "modal";

  return (
    <div
      className={cn(
        "w-full space-y-6",
        inModal ? "p-4 md:p-6" : "mx-auto max-w-7xl p-4 md:p-6",
      )}
    >
      {inModal ? (
        // NOM DE LA BOÎTE DE DIALOGUE. Radix en exige un, et « Ticket » ne
        // dirait pas lequel : c'est la clé et le titre qu'un lecteur d'écran
        // doit entendre en arrivant. Invisible, car le `<h1>` juste dessous les
        // affiche déjà.
        <DialogTitle className="sr-only">
          {ticket.key} — {ticket.title}
        </DialogTitle>
      ) : (
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/projects/${key}/tickets`}>
            <ArrowLeft />
            {t.ticketDetail.backToTickets}
          </Link>
        </Button>
      )}

      {/* En modale, la croix de fermeture se pose dans le coin : sans cette
          réserve à droite, elle chevauchait le bouton « Supprimer ». */}
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-4",
          inModal && "pr-8",
        )}
      >
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

          {/* Les liens n'apparaissent que s'il y en a, ou si l'on peut en poser :
              une carte vide sur chaque ticket serait du bruit permanent. */}
          {(links.length > 0 || canEdit) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="size-4" />
                  {fmt(t.ticketDetail.links.title, { count: links.length })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TicketLinks
                  ticketId={ticket.id}
                  projectKey={project.key}
                  links={links}
                  candidates={linkCandidates}
                  canEdit={canEdit}
                />
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
              <TicketAttachments
                ticketId={ticket.id}
                attachments={ticket.attachments.map((att) => ({
                  id: att.id,
                  filename: att.filename,
                  contentType: att.contentType,
                  size: att.size,
                  canRemove: canRemoveAttachment(user, att, ownership),
                }))}
                canAttach={canAttachToTicket(user)}
              />
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
              <CommentList
                comments={ticket.comments}
                projectKey={key}
                tickets={ticketRefs}
                currentUserId={user?.id ?? null}
              />
              <Separator />
              <CommentForm
                ticketId={ticket.id}
                projectKey={key}
                tickets={ticketRefs}
              />
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
