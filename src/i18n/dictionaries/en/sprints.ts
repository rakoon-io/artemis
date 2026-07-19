import type { SprintsDict } from "../fr/sprints";

/**
 * Namespace `sprints` (anglais). Memes clefs que ../fr/sprints ; seules les
 * valeurs sont traduites. Les marqueurs interpoles {clefs} sont conserves a
 * l'identique.
 */
export const sprints: SprintsDict = {
  // Page (header and empty state)
  title: "Sprints and batches",
  subtitleLead: "Distribute backlog tickets into sprints. A",
  lot: "batch",
  subtitleTail:
    "is a sprint without dates; add dates and a goal to turn it into an iteration.",
  emptyState:
    "No sprint or ticket yet. Create a sprint to start planning.",

  // Groups by state (section titles)
  groupActive: "Active",
  groupPlanned: "Planned",
  groupCompleted: "Completed",

  // Backlog
  backlog: "Backlog",
  ticketsWithoutSprint: "tickets without a sprint",
  backlogEmpty: "The backlog is empty: every ticket is attached to a sprint.",

  // Create dialog
  newSprint: "New sprint",
  createDescription:
    "Without dates, it's just a batch; add a goal and dates to turn it into an iteration.",
  nameLabel: "Name",
  goalLabel: "Goal (optional)",
  goalPlaceholder: "Goal of the iteration…",
  startDateLabel: "Start",
  endDateLabel: "End",
  datesHint: "Fill in both dates, or none.",
  createSubmit: "Create sprint",

  // Sprint card: states (badge)
  statePlanned: "Planned",
  stateActive: "Active",
  stateCompleted: "Completed",

  // Sprint card: content
  ticketOne: "ticket",
  ticketOther: "tickets",
  noGoal: "No goal set.",
  lotNoDates: "Batch, no dates",
  noTicketsInSprint: "No ticket in this sprint.",

  // Ticket distribution menu
  moveTo: "Move to",
  moveTicketAria: "Move ticket to a sprint",
  noSprintCreateOne: "No sprint. Create one.",
  backlogNoSprint: "Backlog (no sprint)",

  // Planning actions (buttons)
  startAction: "Start",
  closeAction: "Close",
  reopen: "Reopen",

  // Deletion
  deleteSprintAria: "Delete sprint {name}",
  deleteTitle: "Delete “{name}”?",
  deleteDescription:
    "The sprint will be deleted and its tickets detached from it (they are not deleted). This action cannot be undone.",

  // Notifications
  ticketAddedToSprint: "Ticket added to the sprint.",
  ticketMovedToBacklog: "Ticket moved back to the backlog.",
  toastCreated: "Sprint “{name}” created.",
  toastStarted: "Sprint “{name}” started.",
  toastCompleted: "Sprint “{name}” closed.",
  toastReopened: "Sprint “{name}” reopened.",
  toastDeleted: "Sprint “{name}” deleted.",
};
