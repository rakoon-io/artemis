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

  remove: "Supprimer",
  removeTitle: "Supprimer « {name} » ?",
  removeDescription:
    "Les tickets ne sont pas supprimés : ils perdent simplement leur version.",
  removed: "Version supprimée.",

  ticketField: "Version",
  noRelease: "Aucune version",
};

export type ReleasesDict = typeof releases;
