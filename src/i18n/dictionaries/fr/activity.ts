/**
 * Namespace `activity` : la zone « Mon activité » de la page d'accueil. Elle
 * répond à trois questions dans cet ordre - où j'en suis, qui m'a cité, ce qui
 * a bougé - et se déplie, la vue compacte suffisant la plupart du temps.
 */
export const activity = {
  title: "Mon activité",

  // Résumé chiffré, doublé du graphique
  todo: "À faire",
  doing: "En cours",
  done: "Terminé",
  assignedOne: "{count} tâche vous est assignée",
  assignedOther: "{count} tâches vous sont assignées",
  assignedNone: "Aucune tâche ne vous est assignée",
  // Lu par les lecteurs d'écran à la place du graphique, qui ne leur dit rien.
  chartAria: "Répartition de vos tâches : {todo} à faire, {doing} en cours, {done} terminées",

  // Volets
  tabTickets: "Mes tâches",
  tabMentions: "Citations",
  tabRecent: "Activité récente",

  // Mes tâches
  ticketsEmpty:
    "Aucune tâche ne vous est assignée pour l'instant. Celles que l'on vous confiera apparaîtront ici.",
  doneHidden: "Les tâches terminées sont rangées en fin de liste.",

  // Citations
  mentionsEmpty:
    "Personne ne vous a cité récemment. Une citation « @ » dans une page, un commentaire ou une description apparaîtra ici.",
  mentionsHint: "Les {count} plus récentes.",
  inPage: "vous a cité dans une page",
  inComment: "vous a cité dans un commentaire",
  inTicket: "vous a cité dans la description de",
  // Auteur inconnu : un compte supprimé laisse sa trace, pas son nom.
  someone: "Quelqu'un",

  // Activité récente
  recentEmpty: "Rien n'a bougé récemment dans vos projets.",
  actionOpened: "a ouvert",
  actionCommented: "a commenté",
  actionEditedPage: "a modifié la page",
  actionCreatedPage: "a créé la page",
  actionAttached: "a joint un fichier à",
  actionLinked: "a lié",

  // Repli
  showMore: "Tout afficher",
  showLess: "Réduire",
};

export type ActivityDict = typeof activity;
