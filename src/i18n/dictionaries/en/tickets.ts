import type { TicketsDict } from "../fr/tickets";

/**
 * Namespace `tickets` (anglais). Memes clefs que ../fr/tickets ; seules les
 * valeurs sont traduites. Les marqueurs interpoles sont conserves a l'identique.
 */
export const tickets: TicketsDict = {
  // List page
  title: "Tickets",
  countSummary: "{from}–{to} of {total} {noun}",
  ticketOne: "ticket",
  ticketOther: "tickets",
  noTickets: "No tickets",
  previous: "Previous",
  next: "Next",
  pageOf: "Page {current} / {total}",

  // Table: empty state
  emptyFiltered: "No tickets match these filters.",
  emptyNone: "No tickets yet.",
  resetFilters: "Reset filters",

  // Table: column headers
  colKey: "Key",
  colTitle: "Title",
  colType: "Type",
  colPriority: "Priority",
  colStatus: "Status",
  colAssignee: "Assignee",
  colSprint: "Sprint",
  colLabels: "Labels",
  colUpdated: "Updated",

  // Filter bar
  searchLabel: "Search",
  searchPlaceholder: "Title or description…",
  typeLabel: "Type",
  typeFilterAria: "Filter by type",
  allTypes: "All types",
  priorityLabel: "Priority",
  priorityFilterAria: "Filter by priority",
  allPriorities: "All priorities",
  assigneeLabel: "Assignee",
  assigneeFilterAria: "Filter by assignee",
  allAssignees: "All assignees",
  sprintLabel: "Sprint",
  sprintFilterAria: "Filter by sprint",
  allSprints: "All sprints",
  labelLabel: "Label",
  labelFilterAria: "Filter by label",
  allLabels: "All labels",
  reset: "Reset",
};
