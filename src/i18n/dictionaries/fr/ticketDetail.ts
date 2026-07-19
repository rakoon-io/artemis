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
  attachments: "Pièces jointes ({count})",
  noAttachments: "Aucune pièce jointe.",
  comments: "Commentaires ({count})",
  noComments: "Aucun commentaire pour l'instant.",

  // Panneau de details
  details: "Détails",
  reporter: "Rapporteur",
  assignee: "Assigné à",
  unassigned: "Non assigné",
  sprint: "Sprint",
  backlog: "Backlog",
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
