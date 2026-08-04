/**
 * Namespace `ticketDetail` : page de detail d'un ticket (description, pieces
 * jointes, commentaires, panneau de details) et actions associees (ajout de
 * commentaire, suppression). Les valeurs metier (noms de type/priorite/label,
 * utilisateurs, cles de tickets, contenu) restent en base et ne sont pas
 * traduites. Les gabarits interpoles utilisent {key}/{count} via `fmt`.
 */
export const ticketDetail = {
  // Navigation
  backToTickets: "Retour aux tickets",

  // Sections
  description: "Description",
  noDescription: "Aucune description.",
  descriptionPlaceholder:
    "Décrivez la demande en Markdown : listes, titres, code, tableaux… Tapez « @ » pour citer un ticket.",
  attachments: "Pièces jointes ({count})",
  noAttachments: "Aucune pièce jointe.",
  // Dépôt et retrait, désormais sur la fiche elle-même : c'était la dernière
  // chose que la modale d'édition savait faire et pas elle.
  attachmentDropHint: "Glissez des fichiers ici, ou collez une image",
  attachmentBrowse: "Parcourir…",
  attachmentUploading: "Envoi en cours…",
  attachmentUploaded: "Pièce jointe ajoutée.",
  attachmentUploadFailed: "L'envoi a échoué.",
  attachmentRemove: "Retirer {name}",
  attachmentRemoved: "Pièce jointe retirée.",
  attachmentRemoveTitle: "Retirer « {name} » ?",
  attachmentRemoveDescription:
    "Le fichier sera définitivement supprimé, et la description du ticket n'est pas modifiée : si elle cite ce fichier, la citation restera visible et ne mènera plus nulle part.",
  comments: "Commentaires ({count})",
  noComments: "Aucun commentaire pour l'instant.",

  // Panneau de details
  details: "Détails",
  reporter: "Rapporteur",
  assignee: "Assigné à",
  unassigned: "Non assigné",
  sprint: "Sprint",
  backlog: "Backlog",
  module: "Module",
  noModule: "Aucun",
  component: "Composant",
  noComponent: "Aucun",
  labels: "Labels",
  noLabels: "Aucun",
  createdAt: "Créé le",
  updatedAt: "Mis à jour le",

  // Formulaire de commentaire
  addComment: "Ajouter un commentaire",
  commentPlaceholder: "Votre message…",
  submitComment: "Commenter",
  emptyComment: "Le commentaire est vide.",
  commentAdded: "Commentaire ajouté.",

  // Suppression du ticket
  deleteTitle: "Supprimer ce ticket ?",
  deleteDescription:
    "Le ticket {key} et ses commentaires/pièces jointes seront définitivement supprimés. Cette action est irréversible.",
  deleteConfirm: "Supprimer définitivement",
  deleteSuccess: "Ticket {key} supprimé.",
};

export type TicketDetailDict = typeof ticketDetail;
