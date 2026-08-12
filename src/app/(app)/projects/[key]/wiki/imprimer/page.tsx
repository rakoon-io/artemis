import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { readingOrder } from "@/lib/wiki-tree";
import { anchorFor, extractOutline } from "@/lib/markdown-outline";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getTicketKeys,
  getWikiPages,
  getWikiPagesContent,
  resolveWikiPage,
} from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { MeetingView } from "@/components/wiki/meeting-view";
import { PrintTrigger } from "@/components/wiki/print-trigger";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * DOCUMENT IMPRIMABLE d'une page de wiki, seule ou avec tout son sous-arbre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI « IMPRIMER » ET NON UN FICHIER PDF ENGENDRÉ
 *
 * Trois voies existaient, et l'écart entre elles n'est pas de goût :
 *
 * - un moteur côté SERVEUR (Puppeteer, Playwright) rend un vrai PDF d'un clic,
 *   et ajoute trois cents mégaoctets de Chromium à une image Docker qui en fait
 *   deux cents. Pour une application que l'on héberge soi-même sur une petite
 *   machine, c'est doubler la taille du déploiement pour une commande utilisée
 *   quelques fois par mois ;
 * - une bibliothèque CÔTÉ CLIENT (jsPDF + html2canvas) photographie la page :
 *   le texte devient une image, donc ni sélectionnable, ni cherchable, ni
 *   lisible par un lecteur d'écran, et les tableaux d'un compte rendu se coupent
 *   au milieu d'une ligne ;
 * - l'IMPRESSION du navigateur, avec « Enregistrer au format PDF » comme
 *   destination. Zéro dépendance, texte véritable, liens conservés, pagination
 *   gérée par le moteur de rendu - et l'utilisateur choisit son format de papier
 *   et ses marges, ce qu'aucune des deux autres ne permet.
 *
 * La troisième coûte un clic de plus dans une fenêtre que tout le monde connaît.
 * C'est le seul prix, et il est payé une fois par document.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE ROUTE, ET NON UNE FEUILLE DE STYLE SUR LA PAGE DU WIKI
 *
 * Imprimer la page du wiki telle quelle demanderait de masquer le plan, la
 * recherche, les commandes d'édition, la colonne du sommaire, l'historique des
 * révisions - et de ne rien oublier à chaque ajout futur. Ici, on ÉNUMÈRE ce qui
 * doit figurer plutôt que de retrancher ce qui ne doit pas : ce qui manque se
 * voit, alors qu'un masquage oublié ne se voit qu'à l'impression.
 *
 * L'écran montre exactement le document qui sortira. C'est aussi une
 * prévisualisation, et c'est pourquoi la fenêtre d'impression ne s'ouvre pas
 * d'autorité (cf. `PrintTrigger`).
 */
export default async function ImprimerWikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ page?: string; sousPages?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const avecSousPages = sp.sousPages === "1";

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const [pages, ticketKeys] = await Promise.all([
    getWikiPages(project.id),
    getTicketKeys(project.id),
  ]);

  const handle = sp.page ?? pages[0]?.id;
  const resolved = handle ? await resolveWikiPage(project.id, handle) : null;
  const racine = resolved?.page ?? null;
  if (!racine) notFound();

  const t = await getDictionary();

  /**
   * L'ORDRE DU DOCUMENT est celui du plan, pas un autre.
   *
   * `readingOrder` est la fonction qu'emploient déjà le bloc « sous-pages » et
   * le gel d'une version publiée. Trois usages, un seul parcours : un sommaire
   * qui ne suivrait pas l'ordre de ses pages ne se remarque qu'en lisant le
   * document entier, c'est-à-dire trop tard.
   */
  const entrees = avecSousPages
    ? readingOrder(pages, racine.id)
    : readingOrder(pages, racine.id).slice(0, 1);

  const contenus = new Map(
    (
      await getWikiPagesContent(
        project.id,
        entrees.map((e) => e.page.id),
      )
    ).map((row) => [row.id, row.content]),
  );

  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((ticket) => [ticket.key.toUpperCase(), ticket.id]),
  );

  /**
   * SOMMAIRE, en un seul parcours partagé.
   *
   * `seen` traverse TOUTES les pages : c'est lui qui garantit que deux pages
   * comportant chacune un « ## Contexte » reçoivent des ancres distinctes. Le
   * même préfixe est ensuite passé au rendu (`anchorPrefix`), sans quoi le
   * sommaire désignerait des ancres que le document n'écrit pas.
   *
   * Chaque page reçoit son propre préfixe : deux documents identiques rendus
   * côte à côte ne peuvent pas se voler leurs liens.
   */
  const seen = new Map<string, number>();
  const sections = entrees.map((entree) => {
    const contenu = contenus.get(entree.page.id) ?? "";
    const prefixe = `p${entree.order}-`;
    return {
      entree,
      contenu,
      prefixe,
      ancre: `page-${entree.order}`,
      // Les titres INTERNES de la page, préfixés comme le fera le rendu.
      titres: extractOutline(contenu).map((head) => ({
        ...head,
        anchor: `${prefixe}${anchorFor(head.title, seen)}`,
      })),
    };
  });

  // Sommaire d'un document d'UNE page : ses titres. D'un document de PLUSIEURS :
  // ses pages, et sous chacune ses titres. Le premier cas n'a pas de « pages »
  // à énumérer - il n'y en a qu'une, celle qu'on lit.
  const multiple = sections.length > 1;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 print:max-w-none print:px-0 print:py-0">
      {/* Barre de commandes : à l'écran seulement. `print:hidden` la retire du
          document, où un bouton n'a évidemment rien à faire. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3 print:hidden">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t.wiki.export.print}</p>
          <p className="text-xs text-muted-foreground">
            {t.wiki.export.printHint}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/projects/${project.key}/wiki?page=${racine.slug ?? racine.id}`}>
              <ArrowLeft />
              {t.wiki.export.backToWiki}
            </Link>
          </Button>
          <PrintTrigger label={t.wiki.export.print} />
        </div>
      </div>

      {/* ─── Page de garde ─────────────────────────────────────────────── */}
      <header className="space-y-1 border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {fmt(t.wiki.export.documentOf, { project: project.name })}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{racine.title}</h1>
        <p className="text-xs text-muted-foreground">
          {fmt(t.wiki.export.generatedOn, { date: formatDateTime(new Date()) })}
          {" · "}
          {multiple
            ? fmt(t.wiki.export.pagesIncluded, { count: sections.length })
            : t.wiki.export.onePageIncluded}
        </p>
      </header>

      {/* ─── Sommaire ──────────────────────────────────────────────────── */}
      {(multiple || sections[0].titres.length > 1) && (
        <nav aria-label={t.wiki.export.tocTitle} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t.wiki.export.tocTitle}
          </h2>
          <ul className="space-y-1 text-sm">
            {sections.map((section) => (
              <li key={section.entree.page.id}>
                {multiple && (
                  <a
                    href={`#${section.ancre}`}
                    className="font-medium hover:underline"
                    style={{
                      // L'indentation dit la hiérarchie, bornée à trois crans
                      // comme partout ailleurs.
                      paddingLeft: `${Math.min(section.entree.depth, 3) * 14}px`,
                    }}
                  >
                    {section.entree.page.title}
                  </a>
                )}
                {section.titres.length > 0 && (
                  <ul className="space-y-0.5">
                    {section.titres.map((titre) => (
                      <li key={titre.anchor}>
                        <a
                          href={`#${titre.anchor}`}
                          className="text-muted-foreground hover:underline"
                          style={{
                            paddingLeft: `${
                              (Math.min(section.entree.depth, 3) +
                                (multiple ? 1 : 0) +
                                Math.min(titre.depth, 2)) *
                              14
                            }px`,
                          }}
                        >
                          {titre.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ─── Corps ─────────────────────────────────────────────────────── */}
      {sections.map((section, index) => (
        <section
          key={section.entree.page.id}
          id={section.ancre}
          // Chaque page repart en haut d'une feuille, sauf la première qui suit
          // la page de garde. Un chapitre qui commence à trois lignes du bas se
          // lit mal, et le document perd la structure qu'il annonce.
          /**
           * `scroll-mt` : à l'écran, cette page est une PRÉVISUALISATION sous
           * l'en-tête collé de l'application - `print:hidden` ne le retire
           * qu'au média `print`. Sans marge, un titre atteint depuis le
           * sommaire du document atterrissait entièrement derrière lui. Sur
           * papier, `scroll-margin` n'a aucun effet : rien n'y défile.
           */
          className={cn(
            "space-y-3 scroll-mt-28 lg:scroll-mt-20",
            index > 0 && "print:break-before-page",
          )}
        >
          {/* Le titre et le chemin ne sont rappelés que pour un document à
              plusieurs pages : seule, la page a déjà son titre en couverture. */}
          {multiple && (
            <div className="space-y-0.5 border-b pb-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {section.entree.page.title}
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                {section.entree.path}
                {section.entree.page.meetingDate &&
                  ` · ${formatDate(section.entree.page.meetingDate)}`}
              </p>
            </div>
          )}

          {!section.contenu.trim() ? (
            <p className="text-sm italic text-muted-foreground">
              {t.wiki.export.emptyPage}
            </p>
          ) : section.entree.page.meetingDate ? (
            /**
             * COMPTE RENDU : le rendu structuré, pas le Markdown brut.
             *
             * Une page datée porte des thèmes, des points référencés (A-01) et
             * un récapitulatif des actions - autant de choses que `parseMeeting`
             * DÉDUIT du texte et qui n'existent nulle part sous forme littérale.
             * L'exporter en Markdown ordinaire rendrait des listes à puces là où
             * l'écran montre des tableaux, et ferait disparaître le
             * récapitulatif, c'est-à-dire ce que l'on vient chercher en
             * rouvrant une réunion.
             */
            <MeetingView
              content={section.contenu}
              projectKey={project.key}
              ticketMap={ticketMap}
              anchorPrefix={section.prefixe}
            />
          ) : (
            <WikiContent
              content={section.contenu}
              projectKey={project.key}
              ticketMap={ticketMap}
              anchorPrefix={section.prefixe}
            />
          )}
        </section>
      ))}
    </div>
  );
}
