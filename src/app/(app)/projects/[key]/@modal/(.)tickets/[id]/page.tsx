import { TicketDetail } from "@/components/ticket/ticket-detail";
import { TicketModal } from "@/components/ticket/ticket-modal";

/**
 * ROUTE INTERCEPTÉE : le ticket s'ouvre en modale, sans quitter la page.
 *
 * `(.)tickets/[id]` détourne les navigations DOUCES vers la fiche d'un ticket
 * faites depuis le projet - la liste, le tableau, un sprint, une version. La
 * page qu'on regardait reste sous la modale, avec ses filtres et son
 * défilement : c'est précisément ce qu'on ne veut pas perdre.
 *
 * Un chargement COMPLET n'est pas intercepté : recharger, ouvrir dans un nouvel
 * onglet ou suivre un lien reçu par courriel donne la page pleine. L'adresse est
 * la même dans les deux cas - une seule fiche, deux encadrements.
 */
export default async function TicketModalRoute({
  params,
}: {
  params: Promise<{ key: string; id: string }>;
}) {
  const { key, id } = await params;
  return (
    <TicketModal href={`/projects/${key}/tickets/${id}`}>
      <TicketDetail projectKey={key} ticketId={id} chrome="modal" />
    </TicketModal>
  );
}
