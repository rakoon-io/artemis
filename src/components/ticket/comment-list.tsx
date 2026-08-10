import { CommentItem } from "@/components/ticket/comment-item";
import { formatDateTime } from "@/lib/utils";
import {
  ticketHintsOf,
  type TicketRef,
  type UserRef,
} from "@/lib/wiki-mentions";
import { getDictionary } from "@/i18n/server";
import type { TicketDetail } from "./ticket-fields";

type CommentItemData = TicketDetail["comments"][number];

/**
 * Liste des commentaires d'un ticket (rendu serveur). Chaque entrée délègue son
 * affichage et sa retouche à `CommentItem` : le corps est du texte riche, et
 * son auteur peut le corriger sur place.
 */
export async function CommentList({
  comments,
  projectKey,
  tickets,
  users = [],
  currentUserId,
}: {
  comments: CommentItemData[];
  projectKey: string;
  /** Tickets du projet : résolution des citations en liens et infobulles. */
  tickets: TicketRef[];
  /** Personnes citables par « @ ». Vide : seules les tâches sont proposées. */
  users?: UserRef[];
  /** Qui lit : seul l'auteur d'un commentaire peut le retoucher. */
  currentUserId: string | null;
}) {
  const t = await getDictionary();
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.ticketDetail.noComments}
      </p>
    );
  }

  const ticketHints = ticketHintsOf(tickets);

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={{
            id: comment.id,
            body: comment.body,
            editedAt: comment.editedAt,
          }}
          projectKey={projectKey}
          tickets={tickets}
          users={users}
          ticketHints={ticketHints}
          canEdit={!!currentUserId && comment.authorId === currentUserId}
          formattedDate={{
            author: comment.author.name ?? comment.author.email,
            created: formatDateTime(comment.createdAt),
          }}
        />
      ))}
    </ul>
  );
}
