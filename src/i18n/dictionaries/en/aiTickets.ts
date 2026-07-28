import type { AiTicketsDict } from "../fr/aiTickets";

/**
 * Namespace `aiTickets` (anglais). Memes clefs que ../fr/aiTickets ; seules les
 * valeurs sont traduites. Les marqueurs interpoles {project}/{index}/{count}/
 * {key} sont conserves a l'identique.
 */
export const aiTickets: AiTicketsDict = {
  // Trigger
  trigger: "Create from text",

  // Step 1: text input
  inputTitle: "Create tickets from a text",
  inputDescription:
    "Paste your meeting notes, a report, an email or a task list. The AI (Mistral) turns them into one or more tickets that you review before creation.",
  textLabel: "Text",
  textPlaceholder: "Paste here the text to turn into tickets…",
  textHint:
    "No ticket is created at this stage: you will be able to adjust everything next.",
  analyze: "Analyze the text",
  analyzing: "Analyzing…",
  pasteFirst: "Paste a text to analyze first.",
  noneSuggested: "No ticket could be suggested from this text.",

  // Optional context field
  contextLabel: "Context / instructions (optional)",
  contextPlaceholder:
    "E.g. technical audience, module involved, title style, default priority…",
  contextDescription:
    "The context of project “{project}” (name, description, components) is taken into account automatically. Add instructions specific to this request here.",

  // Step 2: draft review
  reviewTitle: "Review the suggested tickets",
  reviewDescription:
    "Review and edit each ticket, remove the ones that don't fit, then confirm.",
  reviewEmpty: "You removed every ticket. Go back to analyze another text.",
  ticketIndex: "Ticket {index}",
  removeAria: "Remove this ticket",

  // Draft fields
  titleLabel: "Title",
  titlePlaceholder: "Ticket title",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Details (optional)",
  typeLabel: "Type",
  priorityLabel: "Priority",
  componentLabel: "Component",
  noComponent: "No component",
  selectPlaceholder: "Select…",

  // Actions and notifications
  back: "Back",
  titleRequired: "Add a title to at least one ticket.",
  createOne: "Create ticket",
  createMany: "Create {count} tickets",
  createdOne: "Ticket {key} created.",
  createdMany: "{count} tickets created.",
};
