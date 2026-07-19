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
    },
  },

  // Recherche
  search: {
    placeholder: "Rechercher...",
    ariaLabel: "Rechercher dans le wiki",
    clear: "Effacer la recherche",
  },

  // Suppression
  remove: {
    success: "Page supprimée.",
    title: "Supprimer « {title} » ?",
    description:
      "La page et ses éventuelles sous-pages seront définitivement supprimées. Cette action est irréversible.",
  },
};

export type WikiDict = typeof wiki;
