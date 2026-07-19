import type { TicketDetailDict } from "../fr/ticketDetail";

/**
 * Namespace `ticketDetail` (anglais). Memes clefs que ../fr/ticketDetail ; seules
 * les valeurs sont traduites. Les marqueurs interpoles {key}/{count} sont
 * conserves a l'identique.
 */
export const ticketDetail: TicketDetailDict = {
  // Navigation
  backToTickets: "Back to tickets",

  // Sections
  description: "Description",
  noDescription: "No description.",
  attachments: "Attachments ({count})",
  noAttachments: "No attachments.",
  comments: "Comments ({count})",
  noComments: "No comments yet.",

  // Details panel
  details: "Details",
  reporter: "Reporter",
  assignee: "Assigned to",
  unassigned: "Unassigned",
  sprint: "Sprint",
  backlog: "Backlog",
  labels: "Labels",
  noLabels: "None",
  createdAt: "Created",
  updatedAt: "Updated",

  // Comment form
  addComment: "Add a comment",
  commentPlaceholder: "Your message…",
  submitComment: "Comment",
  emptyComment: "The comment is empty.",
  commentAdded: "Comment added.",

  // Ticket deletion
  deleteTitle: "Delete this ticket?",
  deleteDescription:
    "Ticket {key} and its comments/attachments will be permanently deleted. This action cannot be undone.",
  deleteConfirm: "Delete permanently",
  deleteSuccess: "Ticket {key} deleted.",
};
