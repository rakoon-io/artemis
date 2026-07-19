/**
 * Namespace `taxonomy` : gestionnaires de configuration d'un projet (colonnes,
 * labels, priorites, types, membres). Ne contient que du texte visible ; les
 * valeurs metier saisies par l'utilisateur (noms de colonnes, labels, types,
 * priorites, e-mails, noms) restent en base et ne sont pas traduites.
 *
 * Les libelles partages entre plusieurs gestionnaires sont a la racine ; chaque
 * gestionnaire regroupe ensuite ses clefs propres dans un sous-groupe.
 */
export const taxonomy = {
  // Libelles partages
  name: "Nom",
  color: "Couleur",
  add: "Ajouter",
  nameRequired: "Le nom est requis.",
  ticket: "ticket",

  // Colonnes du workflow
  columns: {
    reordered: "Ordre des colonnes mis à jour.",
    moveUp: "Monter la colonne {name}",
    moveDown: "Descendre la colonne {name}",
    wipBadge: "WIP {count}/{limit}",
    updated: "Colonne mise à jour.",
    created: "Colonne « {name} » ajoutée.",
    deleted: "Colonne « {name} » supprimée.",
    editAria: "Modifier la colonne {name}",
    editTitle: "Modifier la colonne",
    editDescription:
      "Renommez la colonne ou ajustez sa limite d'en-cours (WIP).",
    wipLabel: "Limite WIP (optionnel)",
    wipPlaceholderNone: "Aucune",
    wipHint: "Laissez vide pour retirer la limite.",
    wipShort: "WIP",
    wipInvalid: "La limite WIP doit être un entier positif.",
    deleteAria: "Supprimer la colonne {name}",
    deleteDisabledTitle: "Impossible de supprimer l'unique colonne.",
    deleteTitle: "Supprimer « {name} » ?",
    deleteTickets:
      "Les {count} ticket{s} de cette colonne seront réaffectés à la première colonne du tableau.",
    deleteNoTickets:
      "Les tickets qui s'y trouveraient seraient réaffectés à la première colonne du tableau.",
    newLabel: "Nouvelle colonne",
    newPlaceholder: "ex : En test",
  },

  // Labels
  labels: {
    empty: "Aucun label pour l'instant.",
    created: "Label « {name} » créé.",
    deleted: "Label « {name} » supprimé.",
    deleteAria: "Supprimer le label {name}",
    colorAria: "Couleur du label",
    newLabel: "Nouveau label",
    newPlaceholder: "ex : Urgent",
  },

  // Priorites de ticket
  priorities: {
    reordered: "Ordre des priorités mis à jour.",
    empty: "Aucune priorité pour l'instant.",
    moveUp: "Monter la priorité {name}",
    moveDown: "Descendre la priorité {name}",
    updated: "Priorité mise à jour.",
    created: "Priorité « {name} » créée.",
    deleted: "Priorité « {name} » supprimée.",
    editAria: "Modifier la priorité {name}",
    editTitle: "Modifier la priorité",
    editDescription: "Renommez la priorité ou changez sa couleur.",
    deleteAria: "Supprimer la priorité {name}",
    colorAria: "Couleur de la priorité",
    newLabel: "Nouvelle priorité",
    newPlaceholder: "ex : Haute",
  },

  // Types de ticket
  types: {
    reordered: "Ordre des types mis à jour.",
    empty: "Aucun type pour l'instant.",
    moveUp: "Monter le type {name}",
    moveDown: "Descendre le type {name}",
    updated: "Type mis à jour.",
    created: "Type « {name} » créé.",
    deleted: "Type « {name} » supprimé.",
    editAria: "Modifier le type {name}",
    editTitle: "Modifier le type",
    editDescription: "Renommez le type ou changez sa couleur.",
    deleteAria: "Supprimer le type {name}",
    colorAria: "Couleur du type",
    newLabel: "Nouveau type",
    newPlaceholder: "ex : Bug",
  },

  // Membres du projet
  members: {
    summary:
      "{reporters} rapporteur{rs} avec accès, plus {admins} administrateur{as} (accès à tous les projets).",
    reportersHeading: "Rapporteurs",
    adminsHeading: "Administrateurs",
    fullAccess: "Accès total",
    member: "Membre",
    accessRevoked: "Accès retiré à « {name} ».",
    accessGranted: "Accès accordé à « {name} ».",
    revokeAria: "Retirer l'accès de {name}",
    grantAria: "Donner l'accès à {name}",
    revoke: "Retirer l'accès",
    grant: "Donner l'accès",
  },
};

export type TaxonomyDict = typeof taxonomy;
