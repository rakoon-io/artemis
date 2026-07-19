import type { TaxonomyDict } from "../fr/taxonomy";

/**
 * Namespace `taxonomy` (anglais). Memes clefs que ../fr/taxonomy ; seules les
 * valeurs sont traduites. Les marqueurs interpoles sont conserves a l'identique.
 */
export const taxonomy: TaxonomyDict = {
  // Shared labels
  name: "Name",
  color: "Color",
  add: "Add",
  nameRequired: "Name is required.",
  ticket: "ticket",

  // Workflow columns
  columns: {
    reordered: "Column order updated.",
    moveUp: "Move column {name} up",
    moveDown: "Move column {name} down",
    wipBadge: "WIP {count}/{limit}",
    updated: "Column updated.",
    created: "Column “{name}” added.",
    deleted: "Column “{name}” deleted.",
    editAria: "Edit column {name}",
    editTitle: "Edit column",
    editDescription:
      "Rename the column or adjust its work-in-progress (WIP) limit.",
    wipLabel: "WIP limit (optional)",
    wipPlaceholderNone: "None",
    wipHint: "Leave empty to remove the limit.",
    wipShort: "WIP",
    wipInvalid: "The WIP limit must be a positive integer.",
    deleteAria: "Delete column {name}",
    deleteDisabledTitle: "You can't delete the only column.",
    deleteTitle: "Delete “{name}”?",
    deleteTickets:
      "The {count} ticket{s} in this column will be reassigned to the board's first column.",
    deleteNoTickets:
      "Any tickets it contained would be reassigned to the board's first column.",
    newLabel: "New column",
    newPlaceholder: "e.g. In testing",
  },

  // Labels
  labels: {
    empty: "No labels yet.",
    created: "Label “{name}” created.",
    deleted: "Label “{name}” deleted.",
    deleteAria: "Delete label {name}",
    colorAria: "Label color",
    newLabel: "New label",
    newPlaceholder: "e.g. Urgent",
  },

  // Ticket priorities
  priorities: {
    reordered: "Priority order updated.",
    empty: "No priorities yet.",
    moveUp: "Move priority {name} up",
    moveDown: "Move priority {name} down",
    updated: "Priority updated.",
    created: "Priority “{name}” created.",
    deleted: "Priority “{name}” deleted.",
    editAria: "Edit priority {name}",
    editTitle: "Edit priority",
    editDescription: "Rename the priority or change its color.",
    deleteAria: "Delete priority {name}",
    colorAria: "Priority color",
    newLabel: "New priority",
    newPlaceholder: "e.g. High",
  },

  // Ticket types
  types: {
    reordered: "Type order updated.",
    empty: "No types yet.",
    moveUp: "Move type {name} up",
    moveDown: "Move type {name} down",
    updated: "Type updated.",
    created: "Type “{name}” created.",
    deleted: "Type “{name}” deleted.",
    editAria: "Edit type {name}",
    editTitle: "Edit type",
    editDescription: "Rename the type or change its color.",
    deleteAria: "Delete type {name}",
    colorAria: "Type color",
    newLabel: "New type",
    newPlaceholder: "e.g. Bug",
  },

  // Project members
  members: {
    summary:
      "{reporters} reporter{rs} with access, plus {admins} administrator{as} (access to all projects).",
    reportersHeading: "Reporters",
    adminsHeading: "Administrators",
    fullAccess: "Full access",
    member: "Member",
    accessRevoked: "Access revoked from “{name}”.",
    accessGranted: "Access granted to “{name}”.",
    revokeAria: "Revoke access from {name}",
    grantAria: "Grant access to {name}",
    revoke: "Revoke access",
    grant: "Grant access",
  },
};
