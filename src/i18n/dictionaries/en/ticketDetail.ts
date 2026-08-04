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
  descriptionPlaceholder:
    "Describe the request in Markdown: lists, headings, code, tables… Type “@” to reference a ticket.",
  attachments: "Attachments ({count})",
  noAttachments: "No attachments.",
  // Adding and removing, now on the ticket itself : it was the last thing the
  // edit dialog could do and it could not.
  attachmentDropHint: "Drag files here, or paste an image",
  attachmentBrowse: "Browse…",
  attachmentUploading: "Uploading…",
  attachmentUploaded: "Attachment added.",
  attachmentUploadFailed: "Upload failed.",
  attachmentRemove: "Remove {name}",
  attachmentRemoved: "Attachment removed.",
  attachmentRemoveTitle: "Remove “{name}”?",
  attachmentRemoveDescription:
    "The file will be permanently deleted, and the ticket description is not changed: if it references this file, the reference will remain visible and lead nowhere.",
  comments: "Comments ({count})",
  noComments: "No comments yet.",

  // Details panel
  details: "Details",
  reporter: "Reporter",
  assignee: "Assigned to",
  unassigned: "Unassigned",
  sprint: "Sprint",
  backlog: "Backlog",
  module: "Module",
  noModule: "None",
  component: "Component",
  noComponent: "None",
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
