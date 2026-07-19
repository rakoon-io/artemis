import type { BoardDict } from "../fr/board";

/**
 * Namespace `board` (anglais). Memes clefs que ../fr/board ; seules les valeurs
 * sont traduites. Les marqueurs interpoles sont conserves a l'identique.
 */
export const board: BoardDict = {
  // Column / WIP limit
  wipLimit: "WIP limit: {limit}",
  dropHere: "Drop a ticket here",

  // Quick add
  addTicket: "Add a ticket",
  add: "Add",
  ticketTitlePlaceholder: "Ticket title",
  newTicketTitleLabel: "New ticket title",

  // Filters
  filterAssignee: "Assignee",
  filterType: "Type",
  filterPriority: "Priority",
  filterLabel: "Label",
  unassigned: "Unassigned",
  reset: "Reset",
  all: "All",

  // Drag and drop (accessibility announcements)
  ticketFallback: "ticket",
  announceDragStart: "Started dragging ticket {ticket}.",
  announceDragOver: "Ticket {ticket} is over {over}.",
  announceDragOverNone: "Ticket {ticket} is not over a droppable target.",
  announceDragEnd: "Ticket {ticket} was dropped onto {over}.",
  announceDragEndNone: "Ticket {ticket} was released.",
  announceDragCancel: "Dragging ticket {ticket} was cancelled.",

  // Notifications
  ticketMoved: "Ticket moved.",
  moveFailed: "Failed to move the ticket.",
  ticketCreated: "Ticket {key} created.",

  // Card
  dragTicketLabel: "Move ticket {key}: {title}",
};
