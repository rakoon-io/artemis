import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WikiContent } from "@/components/wiki/wiki-content";
import { formatDateTime, initials } from "@/lib/utils";
import { ticketHintsOf, ticketMapOf, type TicketRef } from "@/lib/wiki-mentions";
import { getDictionary } from "@/i18n/server";
import type { TicketDetail } from "./ticket-fields";

type CommentItem = TicketDetail["comments"][number];

/**
 * Liste des commentaires d'un ticket (présentationnel, rendu serveur).
 *
 * Le corps est rendu comme le reste des textes riches de l'application : ce qui
 * s'écrit en gras dans l'éditeur se lit en gras ici, et une citation « RKN-12 »
 * devient un lien. Sans cela, la mise en forme saisie s'afficherait telle
 * qu'écrite, étoiles comprises.
 */
export async function CommentList({
  comments,
  projectKey,
  tickets,
}: {
  comments: CommentItem[];
  projectKey: string;
  /** Tickets du projet : résolution des citations en liens et infobulles. */
  tickets: TicketRef[];
}) {
  const t = await getDictionary();
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.ticketDetail.noComments}
      </p>
    );
  }

  const ticketMap = ticketMapOf(tickets);
  const ticketHints = ticketHintsOf(tickets);

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(comment.author.name ?? comment.author.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium">
                {comment.author.name ?? comment.author.email}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDateTime(comment.createdAt)}
              </span>
            </div>
            <WikiContent
              className="mt-1 text-sm"
              content={comment.body}
              projectKey={projectKey}
              ticketMap={ticketMap}
              ticketHints={ticketHints}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
