/**
 * Namespace `sprints` : vue Sprints et lots (liste par etat, backlog, creation,
 * carte de sprint et distribution des tickets). Ne contient que du texte visible ;
 * les valeurs metier (noms de sprints, cles de tickets, noms de colonnes, types,
 * priorites) restent en base et ne sont pas traduites. Les gabarits {clefs} sont
 * interpoles via `fmt`.
 */
export const sprints = {
  // Page (en-tete et etat vide)
  title: "Sprints et lots",
  subtitleLead: "Distribuez les tickets du backlog dans les sprints. Un",
  lot: "lot",
  subtitleTail:
    "est un sprint sans dates ; ajoutez des dates et un objectif pour en faire une itération.",
  emptyState:
    "Aucun sprint ni ticket pour l'instant. Créez un sprint pour commencer à planifier.",

  // Groupes par etat (titres de sections)
  groupActive: "Actif",
  groupPlanned: "Planifiés",
  groupCompleted: "Terminés",

  // Backlog
  backlog: "Backlog",
  ticketsWithoutSprint: "tickets sans sprint",
  backlogEmpty: "Le backlog est vide : tous les tickets sont rattachés à un sprint.",

  // Boite de dialogue de creation
  newSprint: "Nouveau sprint",
  createDescription:
    "Sans dates, c'est un simple lot ; ajoutez un objectif et des dates pour en faire une itération.",
  nameLabel: "Nom",
  goalLabel: "Objectif (optionnel)",
  goalPlaceholder: "But de l'itération…",
  startDateLabel: "Début",
  endDateLabel: "Fin",
  datesHint: "Renseignez les deux dates, ou aucune.",
  createSubmit: "Créer le sprint",

  // Carte de sprint : etats (badge)
  statePlanned: "Planifié",
  stateActive: "Actif",
  stateCompleted: "Terminé",

  // Carte de sprint : contenu
  ticketOne: "ticket",
  ticketOther: "tickets",
  noGoal: "Sans objectif défini.",
  lotNoDates: "Lot, sans dates",
  noTicketsInSprint: "Aucun ticket dans ce sprint.",

  // Menu de distribution d'un ticket
  moveTo: "Déplacer vers",
  moveTicketAria: "Déplacer le ticket vers un sprint",
  noSprintCreateOne: "Aucun sprint. Créez-en un.",
  backlogNoSprint: "Backlog (aucun sprint)",

  // Actions de planification (boutons)
  startAction: "Démarrer",
  closeAction: "Clôturer",
  reopen: "Rouvrir",

  // Suppression
  deleteSprintAria: "Supprimer le sprint {name}",
  deleteTitle: "Supprimer « {name} » ?",
  deleteDescription:
    "Le sprint sera supprimé et ses tickets en seront détachés (ils ne sont pas supprimés). Cette action est irréversible.",

  // Notifications
  ticketAddedToSprint: "Ticket ajouté au sprint.",
  ticketMovedToBacklog: "Ticket renvoyé au backlog.",
  toastCreated: "Sprint « {name} » créé.",
  toastStarted: "Sprint « {name} » démarré.",
  toastCompleted: "Sprint « {name} » clôturé.",
  toastReopened: "Sprint « {name} » rouvert.",
  toastDeleted: "Sprint « {name} » supprimé.",
};

export type SprintsDict = typeof sprints;
