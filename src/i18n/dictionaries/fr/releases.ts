/**
 * Namespace `releases` : les VERSIONS du produit (« Release » en base, pour ne
 * pas heurter les versions de spécification du wiki). Ne contient que du texte
 * visible ; les noms de versions sont des données, pas des traductions.
 */
export const releases = {
  title: "Versions",
  subtitle:
    "Ce que vous livrez, et quand. Un sprint dit quand on travaille ; une version dit ce qui sort.",
  empty:
    "Aucune version pour l'instant. Créez-en une dès que vous savez ce que contiendra la prochaine livraison.",

  planned: "À livrer",
  released: "Livrées",
  statePlanned: "En préparation",
  stateReleased: "Livrée",

  create: "Nouvelle version",
  createTitle: "Créer une version",
  createDescription:
    "Le nom suffit : la date et les notes se complètent à tout moment.",
  nameLabel: "Nom",
  namePlaceholder: "1.2.0",
  descriptionLabel: "Notes de version",
  descriptionPlaceholder: "Ce que cette version apporte…",
  dueDateLabel: "Date visée",
  created: "Version créée.",
  updated: "Version mise à jour.",

  ship: "Marquer comme livrée",
  unship: "Remettre en préparation",
  shipped: "Version livrée.",
  unshipped: "Version remise en préparation.",
  dueOn: "Visée le {date}",
  releasedOn: "Livrée le {date}",
  late: "En retard",

  progress: "{done} sur {total} terminés",
  noTickets: "Aucun ticket dans cette version.",

  // Colonne de droite : ce qui n'est prevu dans aucune livraison
  unassigned: "Sans version",
  unassignedHint: "tickets rattachés à aucune version",
  unassignedEmpty: "Tout est rattaché à une version.",
  assignTo: "Rattacher à",
  assignAria: "Rattacher le ticket à une version",
  noReleaseCreateOne: "Aucune version. Créez-en une.",
  ticketAssigned: "Ticket rattaché à la version.",
  ticketUnassigned: "Ticket détaché de sa version.",

  remove: "Supprimer",
  removeTitle: "Supprimer « {name} » ?",
  removeDescription:
    "Les tickets ne sont pas supprimés : ils perdent simplement leur version.",
  removed: "Version supprimée.",

  ticketField: "Version",
  noRelease: "Aucune version",
  // ── Sprints rattachés ──────────────────────────────────────────────────────
  // Rattacher un sprint fait entrer ses tickets dans la version sans qu'on les y
  // range : le contenu hérité doit se signaler, sinon on chercherait en vain
  // pourquoi un ticket figure là.
  sprints: "Sprints :",
  noSprint: "aucun",
  attachSprint: "Rattacher un sprint",
  detachSprint: "Détacher {name}",
  sprintAttached: "Sprint rattaché à la version.",
  sprintDetached: "Sprint détaché de la version.",
  fromSprint: "Hérité du sprint {name}",
};

export type ReleasesDict = typeof releases;
