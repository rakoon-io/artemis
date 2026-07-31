import type { ReleasesDict } from "../fr/releases";

/** Namespace `releases` (anglais). Mêmes clefs que ../fr/releases. */
export const releases: ReleasesDict = {
  title: "Versions",
  subtitle:
    "What you ship, and when. A sprint says when we work; a version says what goes out.",
  empty:
    "No version yet. Create one as soon as you know what the next delivery will contain.",

  planned: "To ship",
  released: "Shipped",
  statePlanned: "In preparation",
  stateReleased: "Shipped",

  create: "New version",
  createTitle: "Create a version",
  createDescription: "A name is enough: date and notes can be filled in later.",
  nameLabel: "Name",
  namePlaceholder: "1.2.0",
  descriptionLabel: "Release notes",
  descriptionPlaceholder: "What this version brings…",
  dueDateLabel: "Target date",
  created: "Version created.",
  updated: "Version updated.",

  ship: "Mark as shipped",
  unship: "Back to preparation",
  shipped: "Version shipped.",
  unshipped: "Version back in preparation.",
  dueOn: "Due {date}",
  releasedOn: "Shipped on {date}",
  late: "Late",

  progress: "{done} of {total} done",
  noTickets: "No ticket in this version.",

  remove: "Delete",
  removeTitle: "Delete “{name}”?",
  removeDescription:
    "Tickets are not deleted: they simply lose their version.",
  removed: "Version deleted.",

  ticketField: "Version",
  noRelease: "No version",
};
