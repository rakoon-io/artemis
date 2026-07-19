import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate, initials } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";
import type { TicketDetail } from "./ticket-fields";

type CommentItem = TicketDetail["comments"][number];

/** Liste des commentaires d'un ticket (présentationnel, rendu serveur). */
export async function CommentList({ comments }: { comments: CommentItem[] }) {
  const t = await getDictionary();
  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t.ticketDetail.noComments}
      </p>
    );
  }

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
                {formatDate(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">
              {comment.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
