import type { SettingsDict } from "../fr/settings";

/** Namespace `settings` (anglais). Meme structure de clefs que la version FR. */
export const settings: SettingsDict = {
  // Onglets de navigation du projet (project-nav.tsx)
  nav: {
    board: "Board",
    tickets: "Tickets",
    sprints: "Sprints",
    wiki: "Wiki",
    settings: "Settings",
    ariaLabel: "Project navigation",
  },

  // En-tete de la page de reglages (settings/page.tsx)
  pageTitle: "{name} - Settings",
  pageSubtitle:
    "Edit the project, customize the workflow (columns, labels, types, priorities) and manage its members.",
  adminOnlyTitle: "Administrators only",
  adminOnlyDescription:
    "Project settings are only accessible to administrators.",

  // Onglets de la page de reglages
  tabs: {
    project: "Project",
    columns: "Columns",
    labels: "Labels",
    types: "Types",
    priorities: "Priorities",
    members: "Members",
  },

  // Cartes de chaque onglet (titre + description)
  projectCardTitle: "Project",
  projectCardDescription: "Edit the project's name and description.",
  columnsCardTitle: "Workflow columns",
  columnsCardDescription:
    "Reorder, rename, cap work in progress (WIP) or delete the Kanban board columns.",
  labelsCardTitle: "Labels",
  labelsCardDescription:
    "Create colored labels to categorize tickets, or delete the ones you no longer use.",
  typesCardTitle: "Ticket types",
  typesCardDescription:
    "Define ticket types (name + color), reorder them or delete the ones you no longer use.",
  prioritiesCardTitle: "Priorities",
  prioritiesCardDescription:
    "Define priorities (name + color), reorder them or delete the ones you no longer use.",
  membersCardTitle: "Project members",
  membersCardDescription:
    "Grant or revoke access to this project, user by user. Administrators can access every project.",

  // Formulaire d'edition du projet (project-settings-form.tsx)
  form: {
    nameLabel: "Name",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Project description (optional)",
    accentLabel: "Accent color",
    accentAriaLabel: "Project accent color",
    accentDefaultSuffix: "(default)",
    accentReset: "Reset",
    accentHint:
      "Customizes the project's main color for buttons and highlights. 'Reset' restores the default accent.",
    nameRequired: "A name is required.",
    updated: "Project updated.",
  },

  // Dialogue de creation de projet (create-project-dialog.tsx)
  create: {
    trigger: "New project",
    title: "New project",
    description: "The key prefixes the project's tickets (e.g. RKN-1).",
    nameLabel: "Name",
    keyLabel: "Key",
    keyHint: "2 to 6 uppercase letters.",
    descriptionLabel: "Description (optional)",
    descriptionPlaceholder: "What the project is about…",
    submit: "Create project",
    submitting: "Creating…",
    created: "Project {key} created.",
  },
};
