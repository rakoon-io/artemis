/**
 * Namespace `wiki` : documentation Markdown d'un projet (index, arborescence,
 * lecture, formulaire de creation/edition, recherche, suppression). Les valeurs
 * metier (titres de pages, contenu Markdown, cles de tickets) restent en base et
 * ne sont pas traduites.
 */
export const wiki = {
  // Partages
  title: "Wiki",
  newPage: "Nouvelle page",

  // Page d'index : recherche, arborescence et lecture d'une page
  index: {
    subtitle:
      "Documentation du projet en Markdown. Citez une tâche avec @ (ex. @RKN-3).",
    emptyTitle: "Aucune page pour l'instant",
    emptyDescription: "Créez la première page de documentation de ce projet.",
    result: "résultat",
    forQuery: "pour « {q} »",
    pagesNavLabel: "Pages du wiki",
    noPagesFound: "Aucune page trouvée.",
    breadcrumbLabel: "Fil d'Ariane",
    unknownAuthor: "Inconnu",
    editedOn: " - modifiée le ",
    subpage: "Sous-page",
    emptyContentHint:
      "Cette page est vide. Cliquez sur « {action} » pour la remplir.",
    selectPagePrompt: "Sélectionnez une page dans la liste.",
  },

  // Formulaire de creation / edition
  form: {
    back: "Retour",
    editTitle: "Modifier la page",
    titleLabel: "Titre",
    titlePlaceholder: "Nom de la page",
    parentLabel: "Page parente",
    parentNone: "Aucune (page racine)",
    parentHelp:
      "Rangez cette page sous une autre pour organiser le wiki en arborescence.",
    contentLabel: "Contenu (Markdown)",
    tabWrite: "Écrire",
    tabPreview: "Aperçu",
    contentPlaceholder:
      "Écrivez en Markdown. Tapez @ pour citer une tâche (ex. @RKN-3).",
    markdownHelpBefore:
      "Markdown étendu (GFM) : titres, gras, listes, cases à cocher, tableaux, code. Tapez ",
    markdownHelpAfter: " pour citer une tâche (elle devient un lien).",
    nothingToPreview: "Rien à prévisualiser pour l'instant.",
    createSubmit: "Créer la page",

    // Bascule entre saisie assistee et Markdown brut
    modeRich: "Mise en forme",
    modeMarkdown: "Markdown",
    modeAria: "Mode de saisie",
    richHint:
      "La mise en forme s'affiche pendant la saisie. Le texte reste enregistré en Markdown.",
    loadingEditor: "Chargement de l'éditeur…",
    titleRequired: "Le titre est requis.",
    created: "Page créée.",
    updated: "Page mise à jour.",
    tools: {
      bold: "Gras",
      italic: "Italique",
      heading: "Titre",
      list: "Liste",
      checkbox: "Case à cocher",
      quote: "Citation",
      code: "Code",
      link: "Lien",
      mention: "Citer une tâche",
      strike: "Barré",
      orderedList: "Liste numérotée",
    },
  },

  // Paquets de specifications : sous-arbres du wiki traites comme un document
  // versionnable. Le nom du paquet est le titre de sa page racine.
  specs: {
    badge: "Spécification",
    rootBadge: "Racine de spécification",
    partOf: "Fait partie de la spécification « {title} ».",
    mark: "Déclarer comme spécification",
    markTitle: "Déclarer « {title} » comme spécification ?",
    markDescription:
      "Cette page et toutes ses sous-pages formeront un document unique, dont vous pourrez publier des versions figées et citables. Aucun contenu n'est modifié.",
    marked: "« {title} » est désormais une spécification.",
    unmark: "Retirer la spécification",
    unmarkTitle: "Retirer la spécification « {title} » ?",
    unmarkDescription:
      "Les pages du wiki ne sont pas supprimées : seule la qualité de spécification est retirée.",
    unmarked: "Spécification retirée.",

    versionsTitle: "Versions publiées",
    versionsEmpty:
      "Aucune version publiée. Publiez-en une pour figer l'état actuel du document.",
    publish: "Publier une version",
    publishDescription:
      "L'état actuel du document est figé et devient consultable tel quel. Une version publiée n'est plus modifiable ; pour corriger, on en publie une nouvelle.",
    labelLabel: "Libellé (optionnel)",
    labelPlaceholder: "MVP, Recette client…",
    noteLabel: "Ce qui change (optionnel)",
    notePlaceholder: "Résumé des évolutions depuis la version précédente…",
    publishSubmit: "Publier la version",
    published: "Version {label} publiée.",
    publishedBy: "publiée par {name}",
    pageOne: "page",
    pageOther: "pages",
    read: "Consulter",
    frozenNotice:
      "Version figée du {date} — lecture seule. Le wiki, lui, continue d'évoluer.",
    backToWorking: "Revenir à la version de travail",
    deleteVersion: "Supprimer la version {label}",
    deleteVersionTitle: "Supprimer la version {label} ?",
    deleteVersionDescription:
      "L'archive de cette version sera définitivement perdue, y compris pour les tickets qui la citent. Cette action est irréversible.",
    versionDeleted: "Version supprimée.",
  },

  // Historique par page : une revision est ecrite a chaque enregistrement qui
  // change le titre ou le contenu.
  history: {
    title: "Historique",
    show: "Historique",
    empty: "Aucune révision enregistrée pour cette page.",
    current: "actuelle",
    by: "par {name}",
    unknownAuthor: "Inconnu",
    frozenNotice: "Révision du {date} — lecture seule.",
    backToPage: "Revenir à la page",
    truncated: "Seules les {count} révisions les plus récentes sont affichées.",
  },

  // Sommaire : arborescence des sections d'une page, pour naviguer dans un
  // document long sans le faire defiler.
  outline: {
    title: "Sommaire",
    ariaLabel: "Sommaire de la page",
    empty: "Cette page ne comporte aucune section.",
  },

  // Recherche
  search: {
    placeholder: "Rechercher...",
    ariaLabel: "Rechercher dans le wiki",
    clear: "Effacer la recherche",
    previous: "Précédent",
    next: "Suivant",
    pageOf: "Page {current} / {total}",
  },

  // Suppression
  remove: {
    success: "Page supprimée.",
    title: "Supprimer « {title} » ?",
    description:
      "La page et ses éventuelles sous-pages seront définitivement supprimées. Cette action est irréversible.",
  },
  // Comptes rendus de reunion. La structure (themes, items) vit dans le Markdown
  // de la page : ces libelles ne decrivent que l'affichage et les commandes.
  meeting: {
    badge: "Compte rendu",
    sectionTitle: "Réunions",
    sectionEmpty: "Aucun compte rendu pour l'instant.",
    heldOn: "Réunion du {date}",

    // Declarer / retirer le marqueur
    mark: "Compte rendu de réunion",
    markAria: "Déclarer cette page comme compte rendu de réunion",
    dialogTitle: "Compte rendu de réunion",
    dialogDescription:
      "Dater la page la fait entrer dans le suivi des réunions et met ses thèmes en tableaux.",
    dateLabel: "Date de la réunion",
    dateRequired: "La date de la réunion est requise.",
    submit: "Marquer comme compte rendu",
    unmark: "Retirer le marqueur",
    unmarkHint: "Le contenu de la page est conservé tel quel.",
    marked: "Page suivie comme compte rendu.",
    unmarked: "La page n'est plus un compte rendu.",

    // Edition graphique des points
    editItems: "Modifier les points",
    editing: "Édition des points",
    preambleLabel: "En-tête (participants, ordre du jour…)",
    preamblePlaceholder: "Contexte de la réunion…",
    themeTitleLabel: "Intitulé du thème {letter}",
    themeTitlePlaceholder: "Sujet abordé…",
    itemPlaceholder: "Point abordé…",
    addTheme: "Ajouter un thème",
    addItem: "Ajouter un point",
    removeTheme: "Supprimer le thème {letter}",
    removeItem: "Supprimer le point {ref}",
    moveThemeUp: "Monter le thème {letter}",
    moveThemeDown: "Descendre le thème {letter}",
    moveItemUp: "Monter le point {ref}",
    moveItemDown: "Descendre le point {ref}",
    notesKept: "Le texte libre de ce thème est conservé tel quel.",
    noThemesYet: "Aucun thème. Ajoutez-en un pour commencer le compte rendu.",
    newThemeTitle: "Nouveau thème",

    // Sections repliables et sommaire des themes
    collapseAria: "Replier ou déplier le thème {letter}",
    themesOutline: "Thèmes de la réunion",
    itemsCount: "{count} point(s)",

    // Lecture du compte rendu
    gotoActions: "Aller au récapitulatif des actions",
    actionsTitle: "Récapitulatif des actions",
    actionsEmpty: "Aucune action décidée pendant cette réunion.",
    themeLabel: "Thème {letter}",
    colRef: "Réf.",
    colKind: "Nature",
    colItem: "Point",
    colTheme: "Thème",
    colAction: "Action",
    kindInfo: "Information",
    kindAction: "Action",
    actionOne: "action",
    actionOther: "actions",
    noThemes:
      "Cette page est datée comme réunion mais ne comporte aucun thème : ajoutez un titre de niveau 2 par thème.",
    help:
      "Un titre de niveau 2 par thème (numérotés A, B, C…), une puce par point. Préfixez « (action) » ou cochez la case pour une action ; sans marqueur, le point est une information.",
  },
};

export type WikiDict = typeof wiki;
