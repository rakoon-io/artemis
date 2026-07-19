import type { TicketFormDict } from "../fr/ticketForm";

/**
 * Namespace `ticketForm` (anglais). Memes clefs que ../fr/ticketForm ; seules
 * les valeurs sont traduites. Les marqueurs interpoles sont conserves.
 */
export const ticketForm: TicketFormDict = {
  // Shared fields (create + edit)
  titleLabel: "Title",
  titlePlaceholder: "Short ticket summary",
  descriptionLabel: "Description",
  descriptionPlaceholderCreate:
    "Details (optional). Pasting an image here adds it as an attachment.",
  descriptionPlaceholderEdit: "Pasting an image here adds it as an attachment.",
  typeLabel: "Type",
  priorityLabel: "Priority",
  assigneeLabel: "Assignee",
  sprintLabel: "Sprint",
  selectPlaceholder: "Select…",
  noAssignee: "No one",
  backlogOption: "Backlog (no sprint)",
  labelsLabel: "Labels",
  titleRequired: "A title is required.",

  // Create dialog
  newTicket: "New ticket",
  createDescription:
    "A title is enough. Paste a screenshot or a log directly: they become attachments.",
  submitCreate: "Create ticket",
  unexpectedResponse: "Unexpected server response.",
  createdToast: "Ticket {key} created.",

  // Edit dialog
  edit: "Edit",
  editTitle: "Edit ticket",
  editDescription: "Update the fields, then save.",
  updatedToast: "Ticket updated.",

  // Label selector
  noLabelsAvailable: "No labels available",
  selectLabels: "Select labels…",
  labelsSelectedOne: "{count} label selected",
  labelsSelectedOther: "{count} labels selected",

  // Attachment field
  attachmentsLabel: "Attachments",
  pastePlaceholder: "Paste (Ctrl/Cmd + V) an image, a log or some text…",
  pasteZoneAria: "Attachment paste zone",
  dropHint: "…or drag and drop your documents here.",
  browse: "Browse…",
  textDetectedOne: "Text detected ({count} character).",
  textDetectedOther: "Text detected ({count} characters).",
  attachAsTxt: "As attachment (.txt)",
  insertIntoDescription: "Insert into description",
  ignore: "Ignore",
  pendingAttachments: "Pending attachments ({count})",
  removeAttachment: "Remove {name}",

  // Attachment notifications
  attachmentsAddedOne: "Attachment added.",
  attachmentsAddedOther: "{count} attachments added.",
  textAttached: "Text added as an attachment.",
  imagesAddedOne: "Image added as an attachment.",
  imagesAddedOther: "{count} images added.",
};
