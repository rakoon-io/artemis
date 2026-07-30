import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookMarked,
  CalendarDays,
  FileText,
  Plus,
  Wrench,
} from "lucide-react";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { cn, formatDate } from "@/lib/utils";
import {
  ancestorsOf,
  groupBySection,
  orderedTree,
  parentOptions,
  sectionOfPage,
} from "@/lib/wiki-tree";
import { MAX_REVISIONS_LISTED } from "@/server/services/wiki.service";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getPageRevision,
  getPageRevisions,
  getSpecPackageForPage,
  getSpecVersion,
  getSpecVersions,
  getComponents,
  getModules,
  getTicketKeys,
  getTicketRefs,
  getWikiPageSubjects,
  getWikiPages,
  getWikiSections,
  resolveWikiPage,
  searchWikiPages,
} from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiSearch } from "@/components/wiki/wiki-search";
import { DeleteWikiPageButton } from "@/components/wiki/delete-wiki-page-button";
import { MarkSpecButton, SpecPanel } from "@/components/wiki/spec-panel";
import { MeetingControls } from "@/components/wiki/meeting-controls";
import { NewMeetingButton } from "@/components/wiki/new-meeting-button";
import { StructureWikiButton } from "@/components/wiki/structure-wiki-button";
import { PageSubjects } from "@/components/wiki/page-subjects";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";
import { WikiPageContent } from "@/components/wiki/wiki-page-content";
import {
  WikiParentInline,
  WikiTitleInline,
} from "@/components/wiki/wiki-page-fields";
import { MeetingView } from "@/components/wiki/meeting-view";
import { PageOutline } from "@/components/wiki/page-outline";
import { MeetingSection } from "@/components/wiki/meeting-editor";
import { SpecVersionView } from "@/components/wiki/spec-version-view";
import { highlightSegments, type Segment } from "@/lib/search-text";
import { extractOutline } from "@/lib/markdown-outline";
import { parseMeeting } from "@/lib/meeting-minutes";
import { isMistralConfigured } from "@/lib/mistral";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * Ordre de lecture des sections : ce que le produit DOIT faire, ce qui S'EST DIT,
 * comment c'est FAIT. Les trois se suivent comme un projet se raconte.
 */
const SECTION_ORDER = ["SPEC", "MEETING", "IMPLEMENTATION"] as const;

const SECTION_ICON = {
  SPEC: BookMarked,
  MEETING: CalendarDays,
  IMPLEMENTATION: Wrench,
} as const;

interface WikiListItem {
  id: string;
  title: string;
  snippet?: string;
  truncatedStart?: boolean;
  truncatedEnd?: boolean;
}

/**
 * Wiki d'un projet (RSC) : recherche + barre latérale des pages + page rendue en
 * Markdown. Les citations de tickets deviennent des liens. Édition ouverte aux
 * utilisateurs connectés ; suppression réservée aux administrateurs.
 */
export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{
    page?: string;
    q?: string;
    p?: string;
    spec?: string;
    rev?: string;
    /** « points » (compte rendu) ou « new » (création). */
    edit?: string;
    /** Parent proposé à la création. */
    parent?: string;
  }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const requestedId = sp.page;
  const q = (sp.q ?? "").trim();
  // Page de RÉSULTATS (`p`), à ne pas confondre avec la page de wiki lue (`page`).
  const resultPage = Math.max(1, Number(sp.p) || 1);

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  // Lecture d'une VERSION PUBLIÉE : on sort de l'arborescence courante. Un
  // instantané n'est pas un état du wiki, c'est un document clos - le mêler à la
  // navigation habituelle laisserait croire qu'il est encore modifiable.
  if (sp.spec) {
    const [version, keys] = await Promise.all([
      getSpecVersion(sp.spec),
      getTicketKeys(project.id),
    ]);
    if (!version || version.package.projectId !== project.id) notFound();
    return (
      <SpecVersionView
        version={version}
        projectKey={project.key}
        ticketMap={Object.fromEntries(
          keys.map((k) => [k.key.toUpperCase(), k.id]),
        )}
      />
    );
  }

  const [allPages, ticketKeys, wikiSections] = await Promise.all([
    getWikiPages(project.id),
    getTicketKeys(project.id),
    getWikiSections(project.id),
  ]);
  const admin = isAdmin(session?.user);
  const t = await getDictionary();

  const results = q ? await searchWikiPages(project.id, q, resultPage) : null;
  const list: WikiListItem[] =
    results?.hits ?? allPages.map((p) => ({ id: p.id, title: p.title }));

  // Ce que porte l'URL est un SLUG (« guide-du-projet »), et non plus un
  // identifiant : l'adresse se lit et se met en favori. Les anciens liens en
  // identifiant continuent d'aboutir, la résolution les accepte encore.
  const handle = requestedId ?? list[0]?.id;
  const resolved = handle ? await resolveWikiPage(project.id, handle) : null;
  const current = resolved?.page ?? null;

  // Infobulles des citations « RKN-123 », indexées par identifiant : titre et
  // assigné, pour savoir de quoi parle un ticket sans quitter la page.
  const ticketHints = Object.fromEntries(
    ticketKeys.map((ticket) => [
      ticket.id,
      {
        key: ticket.key,
        title: ticket.title,
        assignee: ticket.assignee?.name ?? ticket.assignee?.email ?? null,
      },
    ]),
  );

  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((t) => [t.key.toUpperCase(), t.id]),
  );

  // Spécification : la page courante appartient-elle à un paquet, et en est-elle
  // la racine ? Les versions ne sont chargées que dans ce dernier cas - c'est là
  // seulement qu'elles se publient et se consultent.
  const pack = current
    ? await getSpecPackageForPage(project.id, current.id)
    : null;
  const isSpecRoot = !!pack && pack.rootPageId === current?.id;
  const [specVersions, revisions, readRevision] = await Promise.all([
    isSpecRoot ? getSpecVersions(pack.id) : Promise.resolve([]),
    current ? getPageRevisions(current.id) : Promise.resolve([]),
    sp.rev ? getPageRevision(sp.rev) : Promise.resolve(null),
  ]);
  // Une révision ne se lit que sur SA page : un identifiant emprunté à une autre
  // page (ou à un autre projet) est ignoré, pas affiché.
  const frozen =
    readRevision &&
    current &&
    readRevision.page.id === current.id &&
    readRevision.page.projectId === project.id
      ? readRevision
      : null;

  // Fil d'Ariane de la page courante.
  const trail = current ? ancestorsOf(allPages, current.id) : [];

  // PLAN RANGÉ PAR SECTION. L'appartenance n'est stockée nulle part : elle se
  // lit en remontant les ancêtres jusqu'à une racine de section. Les pages
  // libres sortent à part et restent VISIBLES - une taxonomie qui avale ce qui
  // n'y entre pas est pire que pas de taxonomie.
  const { sections: grouped, loose } = groupBySection(
    allPages,
    wikiSections,
    SECTION_ORDER,
  );
  const pageById = new Map(allPages.map((page) => [page.id, page]));
  const meetingRootId =
    wikiSections.find((s) => s.kind === "MEETING")?.rootPageId ?? null;
  const currentIsSectionRoot =
    !!current && wikiSections.some((s) => s.rootPageId === current.id);

  // SUJETS ET FRAÎCHEUR : réservés à la section IMPLÉMENTATION, et à elle seule.
  // Une spécification vit en versions figées, un compte rendu est daté et ne
  // vieillit pas ; leur poser un badge « à relire » apprendrait à ignorer les
  // badges. Le catalogue n'est chargé que dans ce cas, et pas sur chaque page.
  const currentSection = current
    ? sectionOfPage(allPages, wikiSections, current.id)
    : null;

  // ÉCRIRE SANS QUITTER L'ENDROIT. Le formulaire remplace l'article dans la
  // colonne de lecture ; le plan, la section et le sommaire ne bougent pas.
  // Seule la CRÉATION garde un formulaire : une page qui n'existe pas encore n'a
  // rien sur quoi cliquer. Tout le reste - titre, rangement, contenu - se
  // modifie en place, là où il s'affiche.
  const formMode = sp.edit === "new" ? "new" : null;

  /**
   * Parent proposé à la création, du plus explicite au plus contextuel :
   *   1. celui que demande l'URL (bouton « Sous-page ») ;
   *   2. sinon la SECTION où l'on se trouve - créer une page en lisant
   *      l'implémentation, c'est vouloir une page d'implémentation ;
   *   3. sinon la racine.
   * C'est ce qui évite d'avoir à redire, dans un menu déroulant, ce que
   * l'endroit d'où l'on clique disait déjà.
   */
  const askedParent =
    sp.parent && allPages.some((page) => page.id === sp.parent) ? sp.parent : null;
  const sectionRootHere = currentSection
    ? (wikiSections.find((s) => s.kind === currentSection)?.rootPageId ?? null)
    : null;
  const newParentId = askedParent ?? sectionRootHere;

  // Les références de tickets servent en ÉDITION EN PLACE autant qu'à la
  // création : l'autocomplétion « @ » existe des deux côtés.
  const ticketRefs = await getTicketRefs(project.id);
  // Options de rangement : l'arbre privé de la page et de ses descendantes -
  // se ranger sous sa propre sous-page ferait un cycle.
  const parents = parentOptions(allPages, current?.id).map((node) => ({
    id: node.page.id,
    title: node.page.title,
    depth: node.depth,
  }));

  /** Adresse d'une page en mode formulaire, sans perdre la recherche en cours. */
  const formHref = (mode: "page" | "new", parentId?: string | null) => {
    const params = new URLSearchParams();
    if (current && mode === "page") params.set("page", current.slug ?? current.id);
    params.set("edit", mode);
    if (mode === "new" && parentId) params.set("parent", parentId);
    return `/projects/${project.key}/wiki?${params.toString()}`;
  };
  const documents = currentSection === "IMPLEMENTATION" && !frozen;
  const [modules, components, subjects] = documents
    ? await Promise.all([
        getModules(project.id),
        getComponents(project.id),
        getWikiPageSubjects(current!.id),
      ])
    : [[], [], [[], []] as const];

  /**
   * Une ligne du plan. Fonction et non composant : elle vit dans le corps de la
   * page pour y lire `current` et `pageHref`, et n'a pas d'état à porter.
   *
   * L'APLAT S'ARRÊTE AVANT LES FILETS. Peint sur la ligne entière, il passait
   * par-dessus la gouttière : le filet de rappel traversait un rectangle arrondi
   * d'une autre couleur et venait mourir sur ses coins. Le filet dit la place de
   * la page dans le plan, l'aplat dit qu'elle est ouverte - deux propos, deux
   * surfaces, qui n'ont aucune raison de se superposer.
   */
  const pageLink = (page: (typeof allPages)[number], depth: number) => {
    const active = page.id === current?.id;
    return (
      <Link
        key={page.id}
        href={pageHref(page.id)}
        aria-current={active ? "page" : undefined}
        title={page.title}
        className={cn(
          "group/page flex items-stretch text-sm transition-colors",
          active ? "text-foreground" : "text-foreground/75 hover:text-foreground",
        )}
      >
        {Array.from({ length: depth }, (_, level) => (
          <span
            key={level}
            aria-hidden
            className="ml-3 w-0 self-stretch border-l"
          />
        ))}
        <span
          className={cn(
            "ml-1 min-w-0 flex-1 rounded-md px-3 py-2 transition-colors",
            active ? "bg-accent font-semibold" : "group-hover/page:bg-accent/50",
          )}
        >
          {/* Deux lignes plutôt qu'une troncature sèche : un « Réunion
              hebdomadaire du 28 juill… » ne se distingue pas de la semaine
              suivante. */}
          <span className="line-clamp-2">{page.title}</span>
          {/* La DATE sous le titre d'un compte rendu : c'est par elle qu'on le
              cherche, et deux réunions successives ne se distinguent souvent
              que par là. */}
          {page.meetingDate && (
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {formatDate(page.meetingDate)}
            </span>
          )}
        </span>
      </Link>
    );
  };

  /**
   * Un compte rendu se retrouve par sa DATE, jamais par son titre : « Réunion du
   * 4 août » et « Réunion du 4 avril » se suivent dans l'alphabet et à quatre
   * mois d'écart.
   *
   * Le tri chronologique ne s'applique qu'à une section PLATE : si quelqu'un
   * range une page sous un compte rendu, l'ordre de l'arbre reprend ses droits -
   * mieux vaut un classement moins commode qu'un enfant projeté loin de son
   * parent.
   */
  const orderedSection = (
    kind: string,
    nodes: ReturnType<typeof orderedTree<(typeof allPages)[number]>>,
  ) => {
    if (kind !== "MEETING" || nodes.some((node) => node.depth > 0)) return nodes;
    return [...nodes].sort((a, b) => {
      const da = pageById.get(a.page.id)?.meetingDate;
      const db = pageById.get(b.page.id)?.meetingDate;
      if (!da || !db) return da ? -1 : db ? 1 : 0;
      return new Date(db).getTime() - new Date(da).getTime();
    });
  };

  // Deux façons d'ouvrir une page, côte à côte : la page libre, et le compte
  // rendu de réunion - qui a sa date, son adresse datée et son en-tête posés
  // d'avance. Reléguer la seconde derrière la première obligeait à créer une
  // page ordinaire pour ensuite la convertir.
  const createButton = (
    <div className="flex flex-wrap items-center gap-2">
      <NewMeetingButton
        projectId={project.id}
        projectKey={project.key}
        parentId={meetingRootId}
      />
      <Button asChild>
        <Link href={formHref("new", sectionRootHere)}>
          <Plus />
          {t.wiki.newPage}
        </Link>
      </Button>
    </div>
  );

  // Sommaire de la page consultée. Pour un compte rendu, on ne retient que les
  // THÈMES : les sous-titres écrits dans le texte libre d'un thème ne sont pas
  // des sections du document, les lister brouillerait la navigation.
  // Le sommaire décrit CE QUI EST AFFICHÉ : en consultant une révision figée,
  // c'est son contenu d'alors qu'il faut décrire, pas celui de la page courante -
  // les titres ont pu changer depuis, et les liens ne mèneraient nulle part.
  const shownContent = frozen?.content ?? current?.content ?? "";
  const meeting =
    current?.meetingDate && !frozen ? parseMeeting(shownContent) : null;
  const outlineHeadings = meeting
    ? extractOutline(shownContent).filter(
        (head) => head.level === meeting.headingLevel,
      )
    : extractOutline(shownContent);
  const outlineTitle = meeting ? t.wiki.meeting.themesOutline : undefined;

  // Les liens portent le SLUG quand la page en a un, l'identifiant sinon (page
  // antérieure à la fonctionnalité, en attente du script de reprise). La table
  // est construite sur les pages déjà chargées : les résultats de recherche, qui
  // ne renvoient pas le slug, y trouvent le leur sans requête de plus.
  const slugById = new Map(allPages.map((page) => [page.id, page.slug]));
  const resultPageHref = (n: number) =>
    `/projects/${project.key}/wiki?q=${encodeURIComponent(q)}&p=${n}`;

  const pageHref = (id: string) => {
    const handle = slugById.get(id) ?? id;
    return q
      ? `/projects/${project.key}/wiki?page=${handle}&q=${encodeURIComponent(q)}`
      : `/projects/${project.key}/wiki?page=${handle}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.wiki.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.wiki.index.subtitle}
          </p>
        </div>
        {createButton}
      </div>

      {allPages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">{t.wiki.index.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {t.wiki.index.emptyDescription}
            </p>
          </div>
          {createButton}
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          {/* Le PLAN est une zone, pas une marge. Sans surface propre, ses
              titres flottaient sur le même fond que l'article et l'œil ne
              savait plus où finissait la navigation ni où commençait le texte.
              La colonne du sommaire, à droite, porte déjà un cadre : les deux
              flancs se répondent enfin. */}
          <aside className="shrink-0 space-y-3 rounded-lg border bg-card p-3 md:w-64">
            <WikiSearch projectKey={project.key} initialQuery={q} />
            {q && results && (
              <p className="px-1 text-xs text-muted-foreground">
                {results.total} {t.wiki.index.result}
                {results.total > 1 ? "s" : ""}{" "}
                {fmt(t.wiki.index.forQuery, { q })}
              </p>
            )}
            {!q && (
              <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.wiki.index.pagesNavLabel}
              </p>
            )}
            <nav
              className="flex flex-col gap-0.5"
              aria-label={t.wiki.index.pagesNavLabel}
            >
              {q ? (
                // Résultats de recherche : liste plate avec extraits.
                list.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {t.wiki.index.noPagesFound}
                  </p>
                ) : (
                  list.map((p) => (
                    <Link
                      key={p.id}
                      href={pageHref(p.id)}
                      aria-current={p.id === current?.id ? "page" : undefined}
                      className={cn(
                        // Même signalement que dans l'arborescence : un résultat
                        // et une page du plan désignent la même chose.
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        p.id === current?.id
                          ? "bg-accent text-foreground"
                          : "text-foreground/75 hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "block",
                          p.id === current?.id ? "font-semibold" : "font-medium",
                        )}
                      >
                        {p.title}
                      </span>
                      {p.snippet && (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {p.truncatedStart && "…"}
                          {highlightSegments(
                            p.snippet,
                            results?.terms ?? [],
                          ).map((segment: Segment, index: number) =>
                            segment.match ? (
                              // Surligné comme du TEXTE, jamais comme du HTML
                              // reçu de la base : rien à échapper, rien à
                              // injecter depuis le contenu d'une page.
                              <mark
                                key={index}
                                className="rounded-sm bg-primary/20 text-foreground"
                              >
                                {segment.text}
                              </mark>
                            ) : (
                              <span key={index}>{segment.text}</span>
                            ),
                          )}
                          {p.truncatedEnd && "…"}
                        </span>
                      )}
                    </Link>
                  ))
                )
              ) : (
                // PLAN RANGÉ PAR SECTION.
                //
                // Chaque section est une PAGE : son intitulé dans le plan est
                // son titre, pas une étiquette codée en dur. On la renomme, et
                // le plan suit - l'application la reconnaît à son identité.
                //
                // Les pages libres ferment la marche, sous leur propre titre.
                // Elles ne sont jamais masquées : ranger reste facultatif, et
                // une page qui n'entre dans aucune des trois cases doit rester
                // sous les yeux plutôt que de disparaître dans une catégorie
                // qui ne la décrit pas.
                <>
                  {grouped.map(({ kind, rootPageId, nodes }) => {
                    const root = pageById.get(rootPageId);
                    const Icon = SECTION_ICON[kind];
                    return (
                      <div key={kind} className="mb-1">
                        <Link
                          href={pageHref(rootPageId)}
                          aria-current={
                            rootPageId === current?.id ? "page" : undefined
                          }
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                            rootPageId === current?.id
                              ? "bg-accent text-foreground"
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                          )}
                        >
                          <Icon className="size-3.5 shrink-0" aria-hidden />
                          <span className="truncate">
                            {root?.title ?? kind}
                          </span>
                        </Link>
                        {/* Une section vide dit qu'elle ATTEND du contenu.
                            Sans cette ligne, un intitulé suivi de rien passe
                            pour une liste cassée plutôt que pour une place
                            réservée. */}
                        {nodes.length === 0 ? (
                          <p className="px-3 py-1.5 text-xs italic text-muted-foreground">
                            {t.wiki.sections.empty}
                          </p>
                        ) : (
                          orderedSection(kind, nodes).map((node) =>
                            pageLink(node.page, node.depth),
                          )
                        )}
                      </div>
                    );
                  })}

                  {loose.length > 0 && (
                    <div className={grouped.length > 0 ? "mt-1" : undefined}>
                      {grouped.length > 0 && (
                        <p
                          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                          title={t.wiki.sections.looseHint}
                        >
                          {t.wiki.sections.loose}
                        </p>
                      )}
                      {loose.map((node) => pageLink(node.page, node.depth))}
                    </div>
                  )}
                </>
              )}
            </nav>

            {/* Pagination des résultats : la liste latérale en montre dix, une
                recherche large n'a plus à être tronquée en silence. */}
            {q && results && results.total > results.pageSize && (
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                {results.page > 1 ? (
                  <Link
                    href={resultPageHref(results.page - 1)}
                    className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent/50"
                  >
                    {t.wiki.search.previous}
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs text-muted-foreground">
                  {fmt(t.wiki.search.pageOf, {
                    current: results.page,
                    total: Math.ceil(results.total / results.pageSize),
                  })}
                </span>
                {results.page * results.pageSize < results.total ? (
                  <Link
                    href={resultPageHref(results.page + 1)}
                    className="rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent/50"
                  >
                    {t.wiki.search.next}
                  </Link>
                ) : (
                  <span />
                )}
              </div>
            )}

            {/* STRUCTURER : pour les projets d'avant les sections. Rien ne
                s'impose - un wiki sans sections continue de fonctionner, ses
                pages s'affichant simplement toutes ensemble ci-dessus. */}
            {!q && admin && grouped.length < SECTION_ORDER.length && (
              <div className="border-t pt-3">
                <StructureWikiButton projectId={project.id} />
              </div>
            )}

          </aside>

          <div className="min-w-0 flex-1">
            {/* Sous `lg`, le sommaire se place au-dessus du texte : une colonne
                de plus y serait illisible. Au-delà, il passe à droite et SUIT le
                défilement - c'est là qu'il sert, sur un document long. */}
            {outlineHeadings.length > 1 && (
              <div className="mb-4 lg:hidden">
                <PageOutline headings={outlineHeadings} title={outlineTitle} />
              </div>
            )}
            {formMode ? (
              /* ÉCRITURE DANS LE MÊME CADRE que la lecture : mêmes bords, même
                 relief, même place. On ne change pas d'écran pour écrire, on
                 retourne la page. */
              <article className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-8">
                <div className="space-y-1 border-b pb-4">
                  <h2 className="text-xl font-semibold tracking-tight">
                    {t.wiki.newPage}
                  </h2>
                  {/* OÙ la page va naître, dit en toutes lettres : le menu
                      déroulant plus bas le répète, mais on ne le lit qu'après
                      s'être demandé où l'on était. */}
                  <p className="text-sm text-muted-foreground">
                    {newParentId
                      ? fmt(t.wiki.form.willBeCreatedUnder, {
                          parent: pageById.get(newParentId)?.title ?? "",
                        })
                      : t.wiki.form.willBeCreatedAtRoot}
                  </p>
                </div>
                <WikiPageForm
                  projectId={project.id}
                  projectKey={project.key}
                  tickets={ticketRefs}
                  parents={parents}
                  defaultParentId={newParentId}
                  backHref={
                    current
                      ? pageHref(current.id)
                      : `/projects/${project.key}/wiki`
                  }
                />
              </article>
            ) : current ? (
              // La page du wiki est une PAGE : elle a des bords, une marge
              // intérieure, et se pose sur le fond au lieu de s'y fondre. Le
              // texte flottait jusqu'ici entre deux colonnes encadrées, seul
              // élément sans contour de l'écran - ce qui le faisait passer pour
              // un fond, et non pour le document qu'on vient lire.
              <article className="wiki-reading space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div className="space-y-1">
                    {/* FIL D'ARIANE, dont le DERNIER maillon est le rangement
                        lui-même : le parent d'une page, c'est là qu'on le lit,
                        c'est donc là qu'on doit pouvoir le changer. L'afficher
                        une seconde fois sous le fil, comme un champ de plus,
                        disait deux fois la même chose. */}
                    <nav
                      aria-label={t.wiki.index.breadcrumbLabel}
                      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
                    >
                      {trail.slice(0, -1).map((a) => (
                        <span key={a.id} className="flex items-center gap-1">
                          <Link
                            href={pageHref(a.id)}
                            className="hover:text-foreground hover:underline"
                          >
                            {a.title}
                          </Link>
                          <span aria-hidden>/</span>
                        </span>
                      ))}
                      {frozen ? (
                        trail.length > 0 && <span>{trail[trail.length - 1].title}</span>
                      ) : (
                        <WikiParentInline
                          pageId={current.id}
                          title={current.title}
                          content={current.content}
                          parentId={current.parentId}
                          parents={parents}
                          canEdit
                        />
                      )}
                    </nav>
                    <h2>
                      <WikiTitleInline
                        pageId={current.id}
                        title={current.title}
                        parentId={current.parentId}
                        content={current.content}
                        canEdit={!frozen}
                      />
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {current.author?.name ??
                        current.author?.email ??
                        t.wiki.index.unknownAuthor}
                      {t.wiki.index.editedOn}
                      {formatDate(current.updatedAt)}
                    </p>
                    {/* Signalé sur TOUTE page du paquet, pas seulement la
                        racine : en arrivant sur un chapitre par la recherche,
                        on doit savoir qu'on lit une spécification et laquelle. */}
                    {/* Une SECTION dit ce qu'elle est, et pourquoi elle n'a pas
                        de bouton de suppression : sans cette phrase, l'absence
                        passerait pour un oubli. */}
                    {currentIsSectionRoot && (
                      <p className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary">
                          {t.wiki.sections.rootBadge}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {t.wiki.sections.rootUndeletable}
                        </span>
                      </p>
                    )}
                    {current.meetingDate && (
                      <p className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary">
                          {t.wiki.meeting.badge}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fmt(t.wiki.meeting.heldOn, {
                            date: formatDate(current.meetingDate),
                          })}
                        </span>
                      </p>
                    )}
                    {pack && (
                      <p className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary">
                          {isSpecRoot
                            ? t.wiki.specs.rootBadge
                            : t.wiki.specs.badge}
                        </Badge>
                        {!isSpecRoot && (
                          <Link
                            href={pageHref(pack.rootPageId)}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {fmt(t.wiki.specs.partOf, {
                              title: pack.rootPage.title,
                            })}
                          </Link>
                        )}
                      </p>
                    )}
                    {/* Sujets et fraîcheur : des MÉTADONNÉES, au même titre que
                        l'auteur et la date - donc ici, sous le titre, et non en
                        encart au-dessus du texte qu'on vient lire. */}
                    {documents && current && (
                      <div className="pt-1.5">
                        <PageSubjects
                          pageId={current.id}
                          modules={modules.map((m) => ({
                            id: m.id,
                            name: m.name,
                            color: m.color,
                          }))}
                          components={components.map((c) => ({
                            id: c.id,
                            name: c.name,
                            color: c.color,
                            moduleId: c.moduleId,
                          }))}
                          selectedModuleIds={subjects[0].map((s) => s.module.id)}
                          selectedComponentIds={subjects[1].map(
                            (s) => s.component.id,
                          )}
                          updatedAt={current.updatedAt.toISOString()}
                          reviewedAt={current.reviewedAt?.toISOString() ?? null}
                          canEdit
                        />
                      </div>
                    )}
                  </div>
                  {/* `flex-wrap` : jusqu'à cinq commandes tiennent ici, soit
                      770 pixels que rien ne repliait. Sur un téléphone, toute
                      page du wiki débordait de près de 400 pixels et se lisait
                      en glissant l'écran de côté. */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={formHref("new", current.id)}
                      >
                        <Plus />
                        {t.wiki.index.subpage}
                      </Link>
                    </Button>
                    <MeetingControls
                      pageId={current.id}
                      meetingDate={current.meetingDate}
                    />
                    {admin && !pack && (
                      <MarkSpecButton
                        projectId={project.id}
                        pageId={current.id}
                        pageTitle={current.title}
                      />
                    )}
                    {/* Une RACINE DE SECTION ne se supprime pas : les clefs
                        étrangères sont en cascade, et l'effacer emporterait tout
                        son contenu et son historique. Le serveur le refuse déjà
                        - l'UI cesse simplement de le proposer, et dit pourquoi.
                        « L'UI masque, le serveur impose. » */}
                    {admin && !currentIsSectionRoot && (
                      <DeleteWikiPageButton
                        pageId={current.id}
                        pageTitle={current.title}
                        projectKey={project.key}
                      />
                    )}
                  </div>
                </div>

                {isSpecRoot && pack && (
                  <SpecPanel
                    packageId={pack.id}
                    rootTitle={pack.rootPage.title}
                    projectKey={project.key}
                    isAdmin={admin}
                    versions={specVersions.map((v) => ({
                      id: v.id,
                      number: v.number,
                      label: v.label,
                      note: v.note,
                      createdAt: v.createdAt,
                      publishedBy: v.publishedBy,
                      pageCount: v._count.pages,
                    }))}
                  />
                )}

                {frozen ? (
                  <div className="space-y-3">
                    {/* Bandeau explicite : sans lui, on croirait lire la page
                        courante et l'on s'étonnerait que « Modifier » n'ait
                        aucun effet sur ce qu'on voit. */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3">
                      <p className="text-xs text-muted-foreground">
                        {fmt(t.wiki.history.frozenNotice, {
                          date: formatDate(frozen.createdAt),
                        })}
                        {frozen.author
                          ? ` ${fmt(t.wiki.history.by, {
                              name:
                                frozen.author.name ??
                                frozen.author.email ??
                                t.wiki.history.unknownAuthor,
                            })}`
                          : ""}
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={pageHref(current.id)}>
                          {t.wiki.history.backToPage}
                        </Link>
                      </Button>
                    </div>
                    {frozen.content.trim() ? (
                      <WikiContent
                        content={frozen.content}
                        projectKey={project.key}
                        ticketMap={ticketMap}
                        ticketHints={ticketHints}
                      />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        {t.wiki.form.nothingToPreview}
                      </p>
                    )}
                  </div>
                ) : current.meetingDate ? (
                  // Compte rendu : thèmes en tableaux, récapitulatif des actions
                  // en fin de page, et bascule vers l'édition graphique des
                  // points. Une révision figée, elle, se lit toujours telle
                  // qu'elle a été enregistrée (branche ci-dessus).
                  //
                  // Le rendu de lecture est passé en `children` : il reste ainsi
                  // un composant SERVEUR - liens de tickets compris - derrière
                  // une bascule qui, elle, doit être cliente.
                  <MeetingSection
                    pageId={current.id}
                    pageTitle={current.title}
                    parentId={current.parentId}
                    content={current.content}
                    canEdit
                    aiEnabled={isMistralConfigured()}
                    defaultEditing={sp.edit === "points"}
                  >
                    <MeetingView
                      content={current.content}
                      projectKey={project.key}
                      ticketMap={ticketMap}
                      ticketHints={ticketHints}
                    />
                  </MeetingSection>
                ) : (
                  // Contenu MODIFIABLE EN PLACE : le rendu devient l'éditeur au
                  // clic, sans quitter la page ni ouvrir de formulaire.
                  <WikiPageContent
                    pageId={current.id}
                    pageTitle={current.title}
                    parentId={current.parentId}
                    value={current.content}
                    projectKey={project.key}
                    tickets={ticketRefs}
                    ticketMap={ticketMap}
                    ticketHints={ticketHints}
                    canEdit
                  />
                )}

                {/* Historique : une révision par enregistrement qui a changé le
                    titre ou le contenu. La première de la liste correspond à
                    l'état courant, d'où la mention « actuelle ». */}
                {revisions.length > 0 && (
                  <details className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {t.wiki.history.title} ({revisions.length})
                    </summary>
                    <ul className="mt-3 space-y-1">
                      {revisions.map((revision, index) => {
                        const author =
                          revision.author?.name ??
                          revision.author?.email ??
                          t.wiki.history.unknownAuthor;
                        const active = frozen?.id === revision.id;
                        return (
                          <li key={revision.id}>
                            <Link
                              href={`${pageHref(current.id)}&rev=${revision.id}`}
                              className={cn(
                                "flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent",
                                active && "bg-accent font-medium",
                              )}
                            >
                              <span>{formatDate(revision.createdAt)}</span>
                              <span className="text-muted-foreground">
                                {fmt(t.wiki.history.by, { name: author })}
                              </span>
                              {index === 0 && (
                                <Badge variant="secondary">
                                  {t.wiki.history.current}
                                </Badge>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    {revisions.length >= MAX_REVISIONS_LISTED && (
                      <p className="mt-2 px-2 text-xs text-muted-foreground">
                        {fmt(t.wiki.history.truncated, {
                          count: MAX_REVISIONS_LISTED,
                        })}
                      </p>
                    )}
                  </details>
                )}
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.wiki.index.selectPagePrompt}
              </p>
            )}
          </div>

          {/* Colonne du sommaire : collante, elle suit le défilement du texte.
              Masquée sous `lg`, où elle est rendue au-dessus de l'article. */}
          {outlineHeadings.length > 1 && (
            <aside className="hidden shrink-0 lg:block lg:w-64 xl:w-72">
              {/* `top-20` et non `top-6` : l'en-tête de l'application est
                  lui-même collé en haut (`sticky top-0`, 57 px). Se coller plus
                  haut ferait glisser le titre du sommaire DERRIÈRE lui dès le
                  premier défilement - la liste restait lisible, mais son
                  intitulé disparaissait. */}
              <div className="sticky top-20">
                <PageOutline headings={outlineHeadings} title={outlineTitle} />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
