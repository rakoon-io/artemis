/**
 * Namespace `board` : vue Kanban (colonnes, cartes, filtres, glisser-deposer).
 * Ne contient que du texte visible ; les valeurs metier (noms de colonnes,
 * types, priorites, cles de tickets) restent en base et ne sont pas traduites.
 */
export const board = {
  // Colonne / limite WIP
  wipLimit: "Limite WIP : {limit}",
  dropHere: "Déposer un ticket ici",

  // Ajout rapide
  addTicket: "Ajouter un ticket",
  add: "Ajouter",
  ticketTitlePlaceholder: "Titre du ticket",
  newTicketTitleLabel: "Titre du nouveau ticket",

  // Filtres
  filterAssignee: "Assigné",
  filterType: "Type",
  filterPriority: "Priorité",
  filterLabel: "Label",
  unassigned: "Non assigné",
  reset: "Réinitialiser",
  all: "Tous",

  // Glisser-deposer (annonces d'accessibilite)
  ticketFallback: "ticket",
  announceDragStart: "Déplacement du ticket {ticket} commencé.",
  announceDragOver: "Le ticket {ticket} est au-dessus de {over}.",
  announceDragOverNone: "Le ticket {ticket} n'est au-dessus d'aucune cible.",
  announceDragEnd: "Le ticket {ticket} a été déposé sur {over}.",
  announceDragEndNone: "Le ticket {ticket} a été relâché.",
  announceDragCancel: "Déplacement du ticket {ticket} annulé.",

  // Notifications
  ticketMoved: "Ticket déplacé.",
  moveFailed: "Le déplacement du ticket a échoué.",
  ticketCreated: "Ticket {key} créé.",

  // Carte
  dragTicketLabel: "Déplacer le ticket {key} : {title}",
};

export type BoardDict = typeof board;
