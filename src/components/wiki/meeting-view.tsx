import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ACTIONS_ANCHOR,
  meetingActions,
  parseMeeting,
  type MeetingItemKind,
} from "@/lib/meeting-minutes";
import { WikiContent } from "./wiki-content";
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
}: {
  content: string;
  projectKey: string;
  ticketMap: Record<string, string>;
}) {
  const t = await getDictionary();
  const meeting = parseMeeting(content);

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
        />
      </div>
    );
  }

  const actions = meetingActions(meeting);
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
        />
      )}

      {/* Raccourci vers le récapitulatif : la raison première d'une relecture. */}
      <a
        href={`#${ACTIONS_ANCHOR}`}
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

      {meeting.themes.map((theme) => (
        <section key={theme.letter} className="space-y-2">
          <h3 className="flex flex-wrap items-baseline gap-2 text-base font-semibold tracking-tight">
            <span className="rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
              {theme.letter}
            </span>
            {theme.title}
          </h3>

          {theme.notesBefore && (
            <WikiContent
              content={theme.notesBefore}
              projectKey={projectKey}
              ticketMap={ticketMap}
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
            />
          )}
        </section>
      ))}

      <section id={ACTIONS_ANCHOR} className="space-y-2 scroll-mt-6">
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
