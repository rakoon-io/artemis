import { ChevronRight, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ACTIONS_ANCHOR,
  meetingActions,
  parseMeeting,
  type MeetingItemKind,
} from "@/lib/meeting-minutes";
import { extractOutline } from "@/lib/markdown-outline";
import { WikiContent } from "./wiki-content";
import type { TicketHint } from "./ticket-hover-link";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * Lecture d'un COMPTE RENDU DE RÉUNION : un thème par tableau, une référence par
 * point (A-01, A-02…), et le récapitulatif des actions en fin de document.
 *
 * Le lien vers ce récapitulatif est placé EN TÊTE, avant même le premier thème :
 * c'est ce que l'on vient chercher en rouvrant un compte rendu trois semaines
 * plus tard, et il serait absurde de dérouler toute la réunion pour l'atteindre.
 * Le récapitulatif lui-même reste en fin de page, à sa place chronologique.
 *
 * Ce composant n'affiche que la mise en forme : le préambule et les lignes non
 * listées d'un thème sont rendus tels quels en Markdown, si bien qu'une page
 * reste librement rédigeable et qu'aucun texte n'est escamoté.
 */
export async function MeetingView({
  content,
  projectKey,
  ticketMap,
  ticketHints,
  anchorPrefix,
}: {
  content: string;
  projectKey: string;
  ticketMap: Record<string, string>;
  /** Titre et assigné des tickets cités, pour l'infobulle au survol. */
  ticketHints?: Record<string, TicketHint>;
  /**
   * Préfixe des ancres, quand plusieurs comptes rendus cohabitent dans un même
   * document (l'export d'une section « Réunions »).
   *
   * `ACTIONS_ANCHOR` est une CONSTANTE : sans préfixe, dix réunions à la suite
   * portent dix fois le même identifiant, et les dix liens « aller au
   * récapitulatif » ramènent tous au premier.
   */
  anchorPrefix?: string;
}) {
  const t = await getDictionary();
  const meeting = parseMeeting(content);
  const prefixe = anchorPrefix ?? "";
  const ancreActions = `${prefixe}${ACTIONS_ANCHOR}`;

  // Page datée mais sans thème : on l'affiche telle quelle, avec un mot pour
  // dire comment la structurer. Inventer des tableaux vides n'aiderait personne.
  if (!meeting) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {t.wiki.meeting.noThemes}
        </p>
        <WikiContent
          content={content}
          projectKey={projectKey}
          ticketMap={ticketMap}
          ticketHints={ticketHints}
        />
      </div>
    );
  }

  const actions = meetingActions(meeting);

  // Ancres des thèmes : reprises du sommaire général, filtrées au niveau des
  // thèmes. Les recalculer ici risquerait de les décaler d'un cran par rapport
  // à celles que pose le rendu Markdown, et les liens ne mèneraient nulle part.
  const themeHeadings = extractOutline(content).filter(
    (head) => head.level === meeting.headingLevel,
  );
  const kindLabel: Record<MeetingItemKind, string> = {
    info: t.wiki.meeting.kindInfo,
    action: t.wiki.meeting.kindAction,
  };

  return (
    <div className="space-y-6">
      {meeting.preamble && (
        <WikiContent
          content={meeting.preamble}
          projectKey={projectKey}
          ticketMap={ticketMap}
          ticketHints={ticketHints}
          anchorPrefix={anchorPrefix}
        />
      )}

      {/* Raccourci vers le récapitulatif : la raison première d'une relecture. */}
      <a
        href={`#${ancreActions}`}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60"
      >
        <ListChecks className="size-4 shrink-0" aria-hidden />
        {t.wiki.meeting.gotoActions}
        <Badge variant="secondary">
          {actions.length}{" "}
          {actions.length > 1
            ? t.wiki.meeting.actionOther
            : t.wiki.meeting.actionOne}
        </Badge>
      </a>

      {meeting.themes.map((theme, index) => (
        // Section REPLIABLE, en `<details>` natif : le repli fonctionne sans
        // JavaScript, s'ouvre au clavier et reste accessible. L'ancre est posée
        // sur le `<details>` lui-même, dont le résumé demeure visible une fois
        // replié : un lien du sommaire aboutit donc toujours quelque part.
        <details
          key={theme.letter}
          id={`${prefixe}${themeHeadings[index]?.anchor ?? ""}`}
          open
          className="group/theme scroll-mt-20 space-y-2"
        >
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open/theme:rotate-90"
              aria-label={fmt(t.wiki.meeting.collapseAria, {
                letter: theme.letter,
              })}
            />
            <span className="rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
              {theme.letter}
            </span>
            {theme.title}
            <Badge variant="secondary" className="font-normal">
              {fmt(t.wiki.meeting.itemsCount, { count: theme.items.length })}
            </Badge>
          </summary>

          {theme.notesBefore && (
            <WikiContent
              content={theme.notesBefore}
              projectKey={projectKey}
              ticketMap={ticketMap}
              ticketHints={ticketHints}
              anchorPrefix={anchorPrefix}
            />
          )}

          {theme.items.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th scope="col" className="w-20 px-3 py-2 font-medium">
                      {t.wiki.meeting.colRef}
                    </th>
                    <th scope="col" className="w-32 px-3 py-2 font-medium">
                      {t.wiki.meeting.colKind}
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      {t.wiki.meeting.colItem}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {theme.items.map((item) => (
                    <tr key={item.ref} className="border-t align-top">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {item.ref}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            item.kind === "action" ? "default" : "secondary"
                          }
                        >
                          {kindLabel[item.kind]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {/* Rendu Markdown : les citations « RKN-123 » d'un compte
                            rendu deviennent des liens, comme partout ailleurs. */}
                        <WikiContent
                          content={item.text}
                          projectKey={projectKey}
                          ticketMap={ticketMap}
                        ticketHints={ticketHints}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {theme.notesAfter && (
            <WikiContent
              content={theme.notesAfter}
              projectKey={projectKey}
              ticketMap={ticketMap}
              ticketHints={ticketHints}
              anchorPrefix={anchorPrefix}
            />
          )}
        </details>
      ))}

      <section id={ancreActions} className="space-y-2 scroll-mt-20">
        <h3 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <ListChecks className="size-4 shrink-0" aria-hidden />
          {t.wiki.meeting.actionsTitle}
        </h3>
        {actions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {t.wiki.meeting.actionsEmpty}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th scope="col" className="w-20 px-3 py-2 font-medium">
                    {t.wiki.meeting.colRef}
                  </th>
                  <th scope="col" className="w-48 px-3 py-2 font-medium">
                    {t.wiki.meeting.colTheme}
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t.wiki.meeting.colAction}
                  </th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action) => (
                  <tr key={action.ref} className="border-t align-top">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {action.ref}
                    </td>
                    {/* Le thème est rappelé : hors de son tableau, « A-02 » seul
                        ne dit plus de quoi il s'agit. */}
                    <td className="px-3 py-2 text-muted-foreground">
                      {fmt(t.wiki.meeting.themeLabel, {
                        letter: action.themeLetter,
                      })}{" "}
                      · {action.themeTitle}
                    </td>
                    <td className="px-3 py-2">
                      <WikiContent
                        content={action.text}
                        projectKey={projectKey}
                        ticketMap={ticketMap}
                        ticketHints={ticketHints}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
