import { TicketDetail } from "@/components/ticket/ticket-detail";

/**
 * Fiche d'un ticket, en pleine page.
 *
 * Le contenu vit dans `TicketDetail`, partagé avec la modale qu'ouvre un clic
 * depuis la liste ou le tableau (cf. `@modal/(.)tickets/[id]`). Cette page reste
 * la référence : c'est elle qu'on obtient en rechargeant, en ouvrant dans un
 * nouvel onglet, ou en suivant un lien reçu par courriel.
 */
export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  return <TicketDetail projectKey={key} ticketId={id} />;
}
