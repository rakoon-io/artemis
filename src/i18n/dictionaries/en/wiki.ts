import type { WikiDict } from "../fr/wiki";

/**
 * Namespace `wiki` (anglais). Memes clefs que ../fr/wiki ; seules les valeurs
 * sont traduites. Les marqueurs interpoles ({q}, {title}, {action}) sont
 * conserves a l'identique.
 */
export const wiki: WikiDict = {
  // Shared
  title: "Wiki",
  newPage: "New page",

  // Index page: search, tree and page reading
  index: {
    subtitle:
      "Project documentation in Markdown. Mention a task with @ (e.g. @RKN-3).",
    emptyTitle: "No pages yet",
    emptyDescription: "Create the first documentation page for this project.",
    result: "result",
    forQuery: 'for "{q}"',
    pagesNavLabel: "Wiki pages",
    noPagesFound: "No pages found.",
    breadcrumbLabel: "Breadcrumb",
    unknownAuthor: "Unknown",
    editedOn: " - edited on ",
    subpage: "Subpage",
    emptyContentHint: 'This page is empty. Click "{action}" to fill it in.',
    selectPagePrompt: "Select a page from the list.",
  },

  // Create / edit form
  form: {
    back: "Back",
    editTitle: "Edit page",
    titleLabel: "Title",
    titlePlaceholder: "Page name",
    parentLabel: "Parent page",
    parentNone: "None (root page)",
    parentHelp: "Nest this page under another to organize the wiki as a tree.",
    contentLabel: "Content (Markdown)",
    tabWrite: "Write",
    tabPreview: "Preview",
    contentPlaceholder:
      "Write in Markdown. Type @ to mention a task (e.g. @RKN-3).",
    markdownHelpBefore:
      "Extended Markdown (GFM): headings, bold, lists, checkboxes, tables, code. Type ",
    markdownHelpAfter: " to mention a task (it becomes a link).",
    nothingToPreview: "Nothing to preview yet.",
    createSubmit: "Create page",
    titleRequired: "The title is required.",
    created: "Page created.",
    updated: "Page updated.",
    tools: {
      bold: "Bold",
      italic: "Italic",
      heading: "Heading",
      list: "List",
      checkbox: "Checkbox",
      quote: "Quote",
      code: "Code",
      link: "Link",
      mention: "Mention a task",
    },
  },

  // Paquets de specifications : sous-arbres du wiki traites comme un document
  // versionnable. Le nom du paquet est le titre de sa page racine.
  specs: {
    badge: "Specification",
    rootBadge: "Specification root",
    partOf: "Part of the “{title}” specification.",
    mark: "Mark as specification",
    markTitle: "Mark “{title}” as a specification?",
    markDescription:
      "This page and all its sub-pages will form a single document, from which you can publish frozen, citable versions. No content is modified.",
    marked: "“{title}” is now a specification.",
    unmark: "Remove specification",
    unmarkTitle: "Remove the “{title}” specification?",
    unmarkDescription:
      "The wiki pages are not deleted: only the specification status is removed.",
    unmarked: "Specification removed.",

    versionsTitle: "Published versions",
    versionsEmpty:
      "No version published yet. Publish one to freeze the document as it stands.",
    publish: "Publish a version",
    publishDescription:
      "The document is frozen as it stands and becomes readable in that exact state. A published version cannot be edited; to correct it, publish a new one.",
    labelLabel: "Label (optional)",
    labelPlaceholder: "MVP, Client review…",
    noteLabel: "What changed (optional)",
    notePlaceholder: "Summary of changes since the previous version…",
    publishSubmit: "Publish version",
    published: "Version {label} published.",
    publishedBy: "published by {name}",
    pageOne: "page",
    pageOther: "pages",
    read: "Read",
    frozenNotice:
      "Version frozen on {date} — read only. The wiki itself keeps evolving.",
    backToWorking: "Back to the working version",
    deleteVersion: "Delete version {label}",
    deleteVersionTitle: "Delete version {label}?",
    deleteVersionDescription:
      "This version's archive will be permanently lost, including for the tickets that cite it. This action cannot be undone.",
    versionDeleted: "Version deleted.",
  },

  // Historique par page : une revision est ecrite a chaque enregistrement qui
  // change le titre ou le contenu.
  history: {
    title: "History",
    show: "History",
    empty: "No revision recorded for this page.",
    current: "current",
    by: "by {name}",
    unknownAuthor: "Unknown",
    frozenNotice: "Revision from {date} — read only.",
    backToPage: "Back to the page",
    truncated: "Only the {count} most recent revisions are shown.",
  },

  // Search
  search: {
    placeholder: "Search...",
    ariaLabel: "Search the wiki",
    clear: "Clear search",
  },

  // Delete
  remove: {
    success: "Page deleted.",
    title: 'Delete "{title}"?',
    description:
      "The page and any subpages will be permanently deleted. This action cannot be undone.",
  },
};
