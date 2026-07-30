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
    willBeCreatedUnder: "Will be created under “{parent}”",
    willBeCreatedAtRoot: "Will be created at the wiki root.",

    // Bascule entre saisie assistee et Markdown brut
    modeRich: "Formatted",
    modeMarkdown: "Markdown",
    modeAria: "Input mode",
    richPlaceholder: "Write your text. The buttons above format it.",
    richHint:
      "Formatting shows as you type. The text is still stored as Markdown.",
    loadingEditor: "Loading the editor…",
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
      strike: "Strikethrough",
      orderedList: "Numbered list",
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

  // Sommaire : arborescence des sections d'une page, pour naviguer dans un
  // document long sans le faire defiler.
  outline: {
    title: "Contents",
    ariaLabel: "Page contents",
    empty: "This page has no sections.",
  },

  // Search
  search: {
    placeholder: "Search...",
    ariaLabel: "Search the wiki",
    clear: "Clear search",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {current} / {total}",
  },

  // Delete
  remove: {
    success: "Page deleted.",
    title: 'Delete "{title}"?',
    description:
      "The page and any subpages will be permanently deleted. This action cannot be undone.",
  },
  // Ce qu'une page d'implementation documente, et depuis quand on l'a vue.
  subjects: {
    title: "What this page documents",
    empty: "No subject declared",
    emptyHint:
      "Link this page to a module or component so it can be found from the catalogue and from tickets.",
    edit: "Edit",
    dialogTitle: "Documented subjects",
    dialogDescription:
      "Tick the modules and components this page is about. It will then appear on their entry, and on the tickets that concern them.",
    modules: "Modules",
    components: "Components",
    catalogueEmpty:
      "This project has no module or component yet. Declare some from the Structure tab.",
    saved: "Subjects saved.",

    // Fraicheur : ne vaut que pour l'implementation (cf. wiki-freshness).
    freshness: {
      fresh: "Up to date",
      ageing: "Due for review",
      stale: "Out of date",
    },
    checkedOn: "Checked on {date}",
    reviewedOn: "Reviewed on {date}",
    review: "Mark as reviewed",
    reviewHint:
      "Declares the page still accurate, without changing its content or history.",
    reviewed: "Page marked as reviewed.",

    // Sens de lecture inverse : depuis un module, un composant, un ticket.
    documentedBy: "Documented by",
    documentedByEmpty: "No wiki page documents this.",
    ticketDocs: "Documentation",
  },

  // Sections predefinies du wiki : trois rapports au temps, pas trois dossiers.
  sections: {
    empty: "No pages yet.",
    loose: "Other pages",
    looseHint:
      "These pages belong to no section. Move them if you want them filed.",

    structure: "Structure the wiki",
    structureTitle: "Give this wiki its sections",
    structureDescription:
      "Three root pages will be created. You can rename them afterwards: the app recognises them by identity, never by title.",
    structureSpec:
      "Specifications — what the product must do, published as frozen versions.",
    structureMeeting: "Meetings — one set of minutes per meeting, sorted by date.",
    structureImplementation:
      "Implementation — how the product is built, in its only valid state: the latest one.",
    structureSafety:
      "Nothing is deleted or rewritten. Only already identifiable pages are filed: dated pages become meetings, specification roots join the specifications. The rest stays put.",
    structureSubmit: "Create the sections",
    done: "Sections created. {count} page(s) filed.",

    // Une section est une page : elle ne se supprime pas comme les autres.
    rootBadge: "Wiki section",
    rootUndeletable:
      "A section cannot be deleted: doing so would take all its content and history with it.",
  },

  // Comptes rendus de reunion. La structure (themes, items) vit dans le Markdown
  // de la page : ces libelles ne decrivent que l'affichage et les commandes.
  meeting: {
    badge: "Minutes",
    sectionTitle: "Meetings",
    sectionEmpty: "No minutes yet.",
    heldOn: "Meeting of {date}",

    // Ouvrir une reunion depuis un modele, a cote de « Nouvelle page »
    newMeeting: "New meeting",
    newMeetingDescription:
      "The page opens already dated, with its header started and its item editor ready.",
    newMeetingSubmit: "Open the minutes",
    defaultTitle: "Meeting of {date}",
    templatePreamble: "**Attendees:**\n\n**Agenda:**",
    created: "Minutes created.",

    // Declarer / retirer le marqueur
    mark: "Meeting minutes",
    markAria: "Mark this page as meeting minutes",
    dialogTitle: "Meeting minutes",
    dialogDescription:
      "Dating the page adds it to the meeting log and lays its themes out as tables.",
    dateLabel: "Meeting date",
    dateRequired: "The meeting date is required.",
    submit: "Mark as minutes",
    unmark: "Remove the marker",
    unmarkHint: "The page content is kept as-is.",
    marked: "Page now tracked as minutes.",
    unmarked: "The page is no longer minutes.",

    // Construction assistee par l'IA
    aiBuild: "Build from notes",
    aiTitle: "Build the minutes",
    aiDescription:
      "Paste the raw meeting notes: themes and items will be extracted, each classed as information or action.",
    aiPlaceholder: "Notes taken during the meeting…",
    aiSubmit: "Analyse the notes",
    aiReplace: "Themes already entered will be replaced. Nothing is saved until you confirm.",
    aiDone: "{count} theme(s) proposed.",
    kindToggle: "Change the type of item {ref}",

    // Edition graphique des points
    editItems: "Edit items",
    editing: "Editing items",
    preambleLabel: "Header (attendees, agenda…)",
    preamblePlaceholder: "Meeting context…",
    themeTitleLabel: "Title of theme {letter}",
    themeTitlePlaceholder: "Topic discussed…",
    itemPlaceholder: "Item discussed…",
    addTheme: "Add a theme",
    addItem: "Add an item",
    removeTheme: "Delete theme {letter}",
    removeItem: "Delete item {ref}",
    moveThemeUp: "Move theme {letter} up",
    moveThemeDown: "Move theme {letter} down",
    moveItemUp: "Move item {ref} up",
    moveItemDown: "Move item {ref} down",
    notesKept: "The free text of this theme is kept as-is.",
    noThemesYet: "No theme yet.",
    itemAria: "Item {ref}",
    keyboardHint:
      "Enter: line break · ⌘/Ctrl+Enter: next item · Alt+↑/↓: move",

    // Abandon d'une saisie en cours
    discardTitle: "Discard your changes?",
    discardDescription:
      "The themes and items entered since the editor was opened will be lost. The page stays as it was last saved.",
    discardKeep: "Keep writing",
    discardConfirm: "Discard",

    // Sections repliables et sommaire des themes
    collapseAria: "Collapse or expand theme {letter}",
    themesOutline: "Meeting themes",
    itemsCount: "{count} item(s)",

    // Lecture du compte rendu
    gotoActions: "Jump to the action summary",
    actionsTitle: "Action summary",
    actionsEmpty: "No action was decided during this meeting.",
    themeLabel: "Theme {letter}",
    colRef: "Ref.",
    colKind: "Type",
    colItem: "Item",
    colTheme: "Theme",
    colAction: "Action",
    kindInfo: "Information",
    kindAction: "Action",
    actionOne: "action",
    actionOther: "actions",
    noThemes:
      "This page is dated as a meeting but has no theme yet: add one level-2 heading per theme.",
    help:
      "One level-2 heading per theme (lettered A, B, C…), one bullet per item. Prefix with \u201c(action)\u201d or tick the checkbox for an action; with no marker the item is information.",
  },
};
