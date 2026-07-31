/**
 * Aucune modale : on regarde la page elle-même.
 *
 * Sans ce fichier, un créneau parallèle qui ne trouve rien à afficher fait
 * échouer TOUTE la page en 404 - y compris les pages qui existent. C'est le cas
 * de toutes les routes du projet sauf la fiche d'un ticket ouverte au vol.
 */
export default function NoTicketModal() {
  return null;
}
