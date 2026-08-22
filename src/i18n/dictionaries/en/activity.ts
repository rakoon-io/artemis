import type { ActivityDict } from "../fr/activity";

/**
 * Namespace `activity` (anglais). Memes clefs que ../fr/activity ; seules les
 * valeurs sont traduites. Les marqueurs interpoles ({count}, {todo}, {doing},
 * {done}) sont conserves a l'identique.
 */
export const activity: ActivityDict = {
  title: "My activity",

  // Headline figures, mirrored by the chart
  todo: "To do",
  doing: "In progress",
  done: "Done",
  assignedOne: "{count} task is assigned to you",
  assignedOther: "{count} tasks are assigned to you",
  assignedNone: "No task is assigned to you",
  // Read out by screen readers in place of the chart, which tells them nothing.
  chartAria:
    "Breakdown of your tasks: {todo} to do, {doing} in progress, {done} done",

  // Tabs
  tabTickets: "My tasks",
  tabMentions: "Mentions",
  tabRecent: "Recent activity",

  // My tasks
  ticketsEmpty:
    "No task is assigned to you at the moment. Any task you are given will show up here.",
  doneHidden: "Completed tasks are moved to the bottom of the list.",

  // Mentions
  mentionsEmpty:
    "No one has mentioned you recently. An “@” mention in a page, a comment or a description will show up here.",
  mentionsHint: "The {count} most recent.",
  inPage: "mentioned you in a page",
  inComment: "mentioned you in a comment",
  inTicket: "mentioned you in the description of",
  // Unknown author: a deleted account leaves its trace, not its name.
  someone: "Someone",

  // Recent activity
  recentEmpty: "Nothing has changed recently in your projects.",
  actionOpened: "opened",
  actionCommented: "commented on",
  actionEditedPage: "edited the page",
  actionCreatedPage: "created the page",
  actionAttached: "attached a file to",
  actionLinked: "linked",

  // Collapse
  showMore: "Show all",
  showLess: "Show less",
};
