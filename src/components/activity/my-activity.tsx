import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { currentUser } from "@/lib/session";
import { formatDateTime } from "@/lib/utils";
import {
  getMyMentions,
  getMyTickets,
  getRecentActivity,
} from "@/server/queries";
import { ActivityPanel } from "./activity-panel";

/** Les vingt plus récentes, comme demandé : au-delà, ce n'est plus un rappel. */
const MENTIONS_LIMIT = 20;
const RECENT_LIMIT = 20;

/**
 * Zone « Mon activité » de la page d'accueil (RSC).
 *
 * Les trois lectures sont PARALLÈLES et bornées aux projets accessibles (la
 * garde est dans `queries`, jamais ici). Les dates sont mises en forme côté
 * serveur : une seule locale fait foi, et le client n'a pas à rejouer un
 * formatage qui divergerait du sien.
 */
export async function MyActivity() {
  const user = await currentUser();
  if (!user) return null;

  const [myTickets, mentions, recent] = await Promise.all([
    getMyTickets(user),
    getMyMentions(user, MENTIONS_LIMIT),
    getRecentActivity(user, RECENT_LIMIT),
  ]);

  // Rien à dire : on n'occupe pas la page d'un cadre vide. La zone apparaîtra
  // d'elle-même dès qu'une tâche sera confiée ou qu'un projet bougera.
  if (
    myTickets.counts.total === 0 &&
    mentions.length === 0 &&
    recent.length === 0
  ) {
    return null;
  }

  /**
   * Les deux listes partagent leurs préfixes d'identifiant (`ticket:`,
   * `comment:`) : un même ticket cité ET récemment ouvert s'y retrouve deux
   * fois, avec deux dates différentes - celle de la citation et celle de
   * l'ouverture. Sans préfixe distinct, la seconde écrasait la première et la
   * citation s'affichait à la mauvaise date.
   */
  const dates: Record<string, string> = {};
  for (const m of mentions) dates[`m:${m.id}`] = formatDateTime(m.at);
  for (const r of recent) dates[`a:${r.id}`] = formatDateTime(r.at);

  return (
    <ActivityPanel
      tickets={myTickets.rows}
      counts={myTickets.counts}
      mentions={mentions}
      recent={recent}
      dateFormatter={dates}
    />
  );
}

/**
 * Attente de la zone : la même carte, aux mêmes hauteurs, pour que le catalogue
 * des projets ne saute pas quand elle arrive.
 */
export function ActivitySkeleton() {
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-2.5 w-full rounded-full" />
        <Skeleton className="h-3 w-64" />
      </CardContent>
    </Card>
  );
}
