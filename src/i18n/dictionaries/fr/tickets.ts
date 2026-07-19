/**
 * Namespace `tickets` : vue liste des tickets (page, tableau, barre de filtres).
 * Seuls les libelles visibles sont traduits ; les valeurs metier (titres, cles
 * RKN-xx, noms de type / priorite / statut / label, utilisateurs) restent en base.
 */
export const tickets = {
  // Page (liste)
  title: "Tickets",
  countSummary: "{from}–{to} sur {total} {noun}",
  ticketOne: "ticket",
  ticketOther: "tickets",
  noTickets: "Aucun ticket",
  previous: "Précédent",
  next: "Suivant",
  pageOf: "Page {current} / {total}",

  // Tableau : etat vide
  emptyFiltered: "Aucun ticket ne correspond à ces filtres.",
  emptyNone: "Aucun ticket pour le moment.",
  resetFilters: "Réinitialiser les filtres",

  // Tableau : en-tetes de colonnes
  colKey: "Clé",
  colTitle: "Titre",
  colType: "Type",
  colPriority: "Priorité",
  colStatus: "Statut",
  colAssignee: "Assigné",
  colSprint: "Sprint",
  colLabels: "Labels",
  colUpdated: "Mis à jour",

  // Barre de filtres
  searchLabel: "Recherche",
  searchPlaceholder: "Titre ou description…",
  typeLabel: "Type",
  typeFilterAria: "Filtrer par type",
  allTypes: "Tous les types",
  priorityLabel: "Priorité",
  priorityFilterAria: "Filtrer par priorité",
  allPriorities: "Toutes priorités",
  assigneeLabel: "Assigné",
  assigneeFilterAria: "Filtrer par assigné",
  allAssignees: "Tous les assignés",
  sprintLabel: "Sprint",
  sprintFilterAria: "Filtrer par sprint",
  allSprints: "Tous les sprints",
  labelLabel: "Label",
  labelFilterAria: "Filtrer par label",
  allLabels: "Tous les labels",
  reset: "Réinitialiser",
};

export type TicketsDict = typeof tickets;
