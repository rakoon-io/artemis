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
