import { ComponentKind, PrismaClient, Role, SprintState } from "@prisma/client";
// Type seul : voir project.service.ts (evaluation au chargement du module).
import type { TicketTemplate } from "@prisma/client";
import { emptyReport, serializeReport } from "../src/lib/ticket-template";
// Le seed écrit en base sans passer par les services : il doit donc poser
// lui-même les slugs, sinon les pages de démo n'auraient pas d'URL lisible.
import { slugify } from "../src/lib/slug";
import { buildSearchText } from "../src/lib/search-text";
import { specSubtree } from "../src/lib/spec-package";
import bcrypt from "bcryptjs";
import { generateNKeysBetween } from "fractional-indexing";

const prisma = new PrismaClient();

// Jeux par défaut - alignés sur project.service.ts (order = index dans le tableau).
// « Bug » impose le modèle de rapport, comme dans project.service.ts : un défaut
// se signale par ce qu'on a vu, ce qu'on attendait et dans quelles conditions.
const DEFAULT_TICKET_TYPES: ReadonlyArray<{
  name: string;
  color: string;
  template: TicketTemplate;
}> = [
  { name: "Bug", color: "#EF4444", template: "REPORT" },
  { name: "Fonctionnalité", color: "#6366F1", template: "NONE" },
  { name: "Tâche", color: "#0EA5E9", template: "NONE" },
  { name: "Maintenance", color: "#64748B", template: "NONE" },
];
const DEFAULT_TICKET_PRIORITIES = [
  { name: "Basse", color: "#94A3B8" },
  { name: "Moyenne", color: "#0EA5E9" },
  { name: "Haute", color: "#F59E0B" },
  { name: "Urgente", color: "#EF4444" },
];
// Modules fonctionnels de la démo (order = index dans le tableau).
// Un module est un GRAND DOMAINE du produit, au-dessus des composants : c'est de
// la structure produit, pas un conteneur de travail (un module ne se « termine »
// pas, contrairement à un sprint - cf. SPEC.md §3.5). Comme le catalogue de
// composants, il est propre au produit décrit : aucun module par défaut n'est créé
// à la création d'un projet. Les descriptions sont rédigées pour être utiles à
// l'IA (injectées dans le contexte projet).
const DEFAULT_MODULES = [
  {
    name: "Suivi des tickets",
    description:
      "Cycle de vie d'une demande : tableau Kanban, vue liste, détail du ticket, filtres, workflow et planification en sprints.",
    color: "#2563EB",
  },
  {
    name: "Documentation",
    description:
      "Base de connaissances du projet : pages wiki en Markdown, arborescence, recherche et citation de tickets.",
    color: "#DB2777",
  },
  {
    name: "Administration & comptes",
    description:
      "Configuration d'un projet et gestion des accès : workflow, référentiels (labels, types, priorités, composants), membres, comptes et e-mails transactionnels.",
    color: "#0891B2",
  },
  {
    name: "Assistance IA",
    description:
      "Fonctions assistées par l'IA : rédaction d'un ticket à partir d'un texte libre et exposition du produit à un assistant via le protocole MCP.",
    color: "#D97706",
  },
];
// Catalogue de composants applicatifs de la démo (order = index dans le tableau).
// ATTENTION : contrairement aux types et aux priorités, il n'existe volontairement
// AUCUN jeu par défaut à la création d'un projet - un catalogue de composants est
// propre au produit décrit (cf. SPEC.md §3.5). Ce catalogue-ci ne vaut donc que
// pour le projet de démonstration : il décrit Artemis lui-même.
// Les descriptions sont rédigées pour être utiles à l'IA : elles sont injectées
// dans le contexte projet lors de la génération d'un ticket depuis un texte libre.
// `module` = nom du module de rattachement, FACULTATIF (cf. DEFAULT_MODULES).
const DEFAULT_COMPONENTS: Array<{
  name: string;
  kind: ComponentKind;
  description: string;
  color: string;
  module?: string;
}> = [
  {
    name: "Tableau Kanban",
    kind: ComponentKind.PAGE,
    description:
      "Tableau du projet : colonnes de statut, cartes déplaçables à la souris et au clavier, filtres rapides et limite d'en-cours (WIP).",
    color: "#8B5CF6",
    module: "Suivi des tickets",
  },
  {
    name: "Vue liste",
    kind: ComponentKind.PAGE,
    description:
      "Table dense des tickets : filtres, tri multi-colonnes, recherche plein texte et export du résultat.",
    color: "#6366F1",
    module: "Suivi des tickets",
  },
  {
    name: "Détail du ticket",
    kind: ComponentKind.PAGE,
    description:
      "Écran d'un ticket : champs éditables, description, fil de commentaires et pièces jointes.",
    color: "#A855F7",
    module: "Suivi des tickets",
  },
  {
    name: "Paramètres du projet",
    kind: ComponentKind.PAGE,
    description:
      "Configuration d'un projet : colonnes du workflow, labels, types, priorités, composants et membres.",
    color: "#4F46E5",
    module: "Administration & comptes",
  },
  {
    name: "Wiki",
    kind: ComponentKind.PAGE,
    description:
      "Documentation libre du projet : pages Markdown arborescentes, recherche et citation de tickets.",
    color: "#C026D3",
    module: "Documentation",
  },
  // Les deux composants `SHARED` ci-dessous n'ont VOLONTAIREMENT aucun module :
  // ce sont des briques transverses, réutilisées par plusieurs modules à la fois
  // (les labels et les pièces jointes servent au suivi comme au wiki). Le
  // rattachement à un module est facultatif, et ces deux-là le démontrent.
  {
    name: "Sélecteur de labels",
    kind: ComponentKind.SHARED,
    description:
      "Champ réutilisable de choix des labels, et pastilles de label affichées sur les cartes et dans les listes.",
    color: "#14B8A6",
  },
  {
    name: "Champ pièces jointes",
    kind: ComponentKind.SHARED,
    description:
      "Zone de dépôt et de collage réutilisable (image du presse-papier, log, fichier) avec vignette et téléchargement.",
    color: "#10B981",
  },
  {
    name: "Notifications e-mail",
    kind: ComponentKind.SERVICE,
    description:
      "Envoi des e-mails transactionnels via Mailjet : assignation, nouveau commentaire, initialisation de mot de passe.",
    color: "#F59E0B",
    module: "Administration & comptes",
  },
  {
    name: "Génération IA",
    kind: ComponentKind.SERVICE,
    description:
      "Rédaction assistée d'un ticket à partir d'un texte libre, en s'appuyant sur le contexte du projet (types, priorités, composants).",
    color: "#F97316",
    module: "Assistance IA",
  },
  {
    name: "Serveur MCP",
    kind: ComponentKind.SERVICE,
    description:
      "Serveur MCP exposant les projets et les tickets à un assistant IA, au nom d'un compte de service.",
    color: "#EA580C",
    module: "Assistance IA",
  },
];
// Colonnes par défaut ; "En cours" porte une limite de WIP à titre d'exemple
// (démontre la personnalisation du workflow, cf. SPEC.md §3.6).
const DEFAULT_COLUMNS = [
  { name: "Backlog", wipLimit: null as number | null },
  { name: "À faire", wipLimit: null as number | null },
  { name: "En cours", wipLimit: 3 },
  { name: "En revue", wipLimit: null },
  { name: "Terminé", wipLimit: null },
];

async function main() {
  // --- Utilisateurs ---
  const admin = await prisma.user.upsert({
    where: { email: "admin@rakoon.io" },
    update: {},
    create: {
      email: "admin@rakoon.io",
      name: "Admin Rakoon",
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash("***MOT-DE-PASSE-RETIRE***", 12),
    },
  });
  const reporter = await prisma.user.upsert({
    where: { email: "rapporteur@rakoon.io" },
    update: {},
    create: {
      email: "rapporteur@rakoon.io",
      name: "Rémy Rapporteur",
      role: Role.REPORTER,
      passwordHash: await bcrypt.hash("***MOT-DE-PASSE-RETIRE***", 12),
    },
  });
  // Compte de service pour l'assistant IA (serveur MCP). Sans mot de passe : il
  // n'a pas d'accès web, il agit via le serveur MCP (voir MCP.md).
  const assistant = await prisma.user.upsert({
    where: { email: "bot@rakoon.io" },
    update: {},
    create: {
      email: "bot@rakoon.io",
      name: "Artemis Assistant",
      role: Role.REPORTER,
    },
  });

  // --- Projet de démonstration (idempotent) ---
  if (await prisma.project.findUnique({ where: { key: "RKN" } })) {
    console.log("Seed déjà présent (projet RKN) - rien à faire.");
    return;
  }

  const project = await prisma.project.create({
    data: {
      key: "RKN",
      name: "Artemis",
      description: "Projet de démonstration livré par le seed.",
      columns: {
        create: DEFAULT_COLUMNS.map((c, order) => ({
          name: c.name,
          order,
          wipLimit: c.wipLimit,
        })),
      },
      labels: {
        create: [
          { name: "bug", color: "#EF4444" },
          { name: "feature", color: "#6366F1" },
          { name: "urgent", color: "#F59E0B" },
          { name: "documentation", color: "#10B981" },
        ],
      },
      ticketTypes: {
        create: DEFAULT_TICKET_TYPES.map((t, order) => ({ ...t, order })),
      },
      ticketPriorities: {
        create: DEFAULT_TICKET_PRIORITIES.map((p, order) => ({ ...p, order })),
      },
      // Les modules sont créés AVEC le projet ; les composants viennent juste
      // après, une fois les identifiants de module disponibles (cf. plus bas).
      modules: {
        create: DEFAULT_MODULES.map((m, order) => ({ ...m, order })),
      },
      // Trois sprints pour illustrer le cycle de vie complet (SPEC.md §3.4) :
      // un clôturé (historique), un actif (en cours, dates autour d'aujourd'hui)
      // et un planifié (à venir, encore en préparation).
      sprints: {
        create: [
          {
            name: "Sprint 0",
            goal: "Cadrage initial et maquettes",
            state: SprintState.COMPLETED,
            startDate: new Date("2026-06-15"),
            endDate: new Date("2026-06-28"),
          },
          {
            name: "Sprint 1",
            goal: "Poser les fondations produit",
            state: SprintState.ACTIVE,
            startDate: new Date("2026-07-14"),
            endDate: new Date("2026-07-25"),
          },
          {
            name: "Sprint 2",
            goal: "Personnalisation & notifications",
            state: SprintState.PLANNED,
            startDate: new Date("2026-07-28"),
            endDate: new Date("2026-08-08"),
          },
        ],
      },
    },
    include: {
      columns: true,
      labels: true,
      sprints: true,
      ticketTypes: true,
      ticketPriorities: true,
      modules: true,
    },
  });

  // Le Rapporteur et l'assistant IA sont membres du projet de démonstration.
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: reporter.id },
      { projectId: project.id, userId: assistant.id },
    ],
  });

  const col = (name: string) => project.columns.find((c) => c.name === name)!;
  const label = (name: string) => project.labels.find((l) => l.name === name)!;
  const type = (name: string) => project.ticketTypes.find((t) => t.name === name)!;
  const priority = (name: string) =>
    project.ticketPriorities.find((p) => p.name === name)!;
  const sprint = (name: string) => project.sprints.find((s) => s.name === name)!;
  const mod = (name: string) => project.modules.find((m) => m.name === name)!;

  // Les composants sont créés APRÈS le projet : chacun résout par son nom le
  // module auquel il se rattache (aucun pour les composants transverses).
  const components = await Promise.all(
    DEFAULT_COMPONENTS.map((c, order) =>
      prisma.component.create({
        data: {
          projectId: project.id,
          name: c.name,
          kind: c.kind,
          description: c.description,
          color: c.color,
          order,
          moduleId: c.module ? mod(c.module).id : null,
        },
      }),
    ),
  );
  const component = (name: string) => components.find((c) => c.name === name)!;

  // Jeu de tickets couvrant plusieurs cas d'usage : les 4 types, les 4 priorités,
  // les 5 colonnes, les 3 sprints (+ backlog non planifié), des tickets assignés
  // à l'Admin, au Rapporteur ou à personne, et des libellés simples/multiples.
  // La plupart des tickets pointent vers un composant applicatif ; quelques-uns
  // n'en ont volontairement aucun (transverses), le champ étant optionnel.
  // `module` ne se renseigne QUE sur un ticket sans composant : c'est l'invariant
  // du module effectif (cf. SPEC.md §3.5). Dès qu'un composant est posé, le module
  // du ticket est celui du composant - le champ propre reste donc à `null`.
  const samples: Array<{
    title: string;
    type: string;
    priority: string;
    column: string;
    labels?: string[];
    assignee?: string;
    sprint?: string;
    component?: string;
    module?: string;
    /** Description libre (types sans modèle imposé). */
    description?: string;
    /**
     * Rapport structuré, pour les tickets de type « Bug » : ce type impose le
     * modèle `REPORT` dans les projets neufs, la démo doit donc le respecter -
     * sinon elle montrerait des bugs non conformes à leur propre type.
     */
    report?: { observation: string; expected: string; context: string; specs?: string };
  }> = [
    { title: "Coller une image du presse-papier à la création", type: "Fonctionnalité", priority: "Haute", column: "En cours", labels: ["feature"], assignee: admin.id, sprint: "Sprint 1", component: "Champ pièces jointes" },
    { title: "Le drag & drop clavier ne fonctionne pas sur Firefox", type: "Bug", priority: "Urgente", column: "À faire", labels: ["bug", "urgent"], sprint: "Sprint 1", component: "Tableau Kanban", report: { observation: "Sur le tableau Kanban, prendre une carte avec Espace puis la déplacer avec les flèches n'a aucun effet : la carte reste dans sa colonne et aucune annonce vocale n'est émise.", expected: "La carte suit les flèches de colonne en colonne, et un message vocal annonce la colonne visée puis la validation du dépôt, comme sur Chrome.", context: "Firefox 128 (macOS 15) et Firefox 128 (Windows 11). Chrome 127 et Safari 18 se comportent correctement. Reproduit sur le projet RKN avec le compte rapporteur.", specs: "L'exigence d'accessibilité impose que le Kanban soit entièrement jouable au clavier." } },
    { title: "Ajouter la limite de WIP par colonne", type: "Fonctionnalité", priority: "Moyenne", column: "Terminé", labels: ["feature"], assignee: admin.id, sprint: "Sprint 0", component: "Tableau Kanban" },
    { title: "Migrer le schéma Prisma en production", type: "Maintenance", priority: "Moyenne", column: "En revue", assignee: admin.id, sprint: "Sprint 1" },
    { title: "Filtrer la vue liste par sprint", type: "Tâche", priority: "Basse", column: "Terminé", assignee: reporter.id, sprint: "Sprint 0", component: "Vue liste" },
    { title: "Erreur 500 à la suppression d'une colonne pleine", type: "Bug", priority: "Haute", column: "À faire", labels: ["bug"], component: "Paramètres du projet", report: { observation: "Supprimer depuis les Paramètres une colonne contenant encore des tickets renvoie une erreur 500 ; la colonne subsiste et aucun message n'explique le refus.", expected: "Soit la suppression est refusée avec un message indiquant combien de tickets bloquent, soit les tickets sont réaffectés à la première colonne, mais jamais une erreur brute.", context: "Paramètres → Colonnes, colonne « En revue » contenant 3 tickets. Reproduit en local et sur la recette." } },
    { title: "Configurer MinIO pour les pièces jointes", type: "Maintenance", priority: "Moyenne", column: "Terminé", assignee: admin.id, sprint: "Sprint 0", component: "Champ pièces jointes" },
    { title: "Thème sombre : contraste insuffisant sur les badges", type: "Bug", priority: "Basse", column: "En cours", labels: ["bug"], component: "Sélecteur de labels", report: { observation: "En thème sombre, le texte des badges de label sur fond teinté descend à un rapport de contraste d\u0027environ 2,8:1 : les libellés clairs deviennent illisibles.", expected: "Le texte des badges reste lisible dans les deux thèmes, avec un contraste d\u0027au moins 4,5:1.", context: "Thème sombre, vue liste et détail d\u0027un ticket. Mesuré au vérificateur de contraste sur les labels « feature » et « documentation ».", specs: "Critère WCAG 2.1 AA, 1.4.3 Contraste minimum." } },
    { title: "Rédiger le guide de contribution (wiki)", type: "Tâche", priority: "Basse", column: "Backlog", labels: ["documentation"], component: "Wiki" },
    { title: "Notifications e-mail sur assignation", type: "Fonctionnalité", priority: "Moyenne", column: "Backlog", labels: ["feature"], sprint: "Sprint 2", component: "Notifications e-mail" },
    { title: "Ajouter un export CSV de la vue liste", type: "Fonctionnalité", priority: "Basse", column: "Backlog", component: "Vue liste", description: "Exporter les tickets **filtrés** de la vue liste au format CSV (séparateur `;`, encodage UTF-8 avec BOM pour Excel).\n\nColonnes : clé, titre, type, priorité, statut, assigné, sprint, module, composant, mise à jour." },
    { title: "Mon mot de passe oublié ne reçoit pas d'e-mail", type: "Bug", priority: "Urgente", column: "À faire", labels: ["bug", "urgent"], assignee: reporter.id, component: "Notifications e-mail", report: { observation: "Après une demande de réinitialisation, aucun e-mail n\u0027arrive. Le journal des envois indique le statut ÉCHEC sans détail.", expected: "L\u0027e-mail de réinitialisation parvient au destinataire en moins d\u0027une minute, et un échec d\u0027envoi est affiché à l\u0027utilisateur au lieu d\u0027un succès trompeur.", context: "Adresses en @exemple.fr, environnement de recette, SMTP interne. Reproduit trois fois de suite le 28/07." } },
    // Les deux tickets suivants n'ont aucun composant (ils touchent plusieurs
    // écrans à la fois) mais portent leur PROPRE module : ils démontrent la
    // qualification à grosse maille, quand aucun composant précis ne convient.
    { title: "Uniformiser les icônes de type de ticket", type: "Maintenance", priority: "Basse", column: "En revue", module: "Suivi des tickets" },
    { title: "Ajouter un raccourci clavier pour créer un ticket", type: "Fonctionnalité", priority: "Moyenne", column: "Backlog", labels: ["feature"], sprint: "Sprint 2", module: "Suivi des tickets" },
  ];

  // Rangs par colonne
  const perColumn = new Map<string, number>();
  for (const s of samples) perColumn.set(s.column, (perColumn.get(s.column) ?? 0) + 1);
  const ranks = new Map<string, string[]>();
  for (const [name, count] of perColumn) ranks.set(name, generateNKeysBetween(null, null, count));
  const idx = new Map<string, number>();

  const ticketIdByTitle = new Map<string, string>();
  let number = 0;
  for (const s of samples) {
    number += 1;
    const i = idx.get(s.column) ?? 0;
    idx.set(s.column, i + 1);
    const ticket = await prisma.ticket.create({
      data: {
        projectId: project.id,
        number,
        key: `RKN-${number}`,
        title: s.title,
        // Un rapport structuré est sérialisé par le module qui le relira : la
        // démo utilise donc exactement le format que l'application impose.
        description: s.report
          ? serializeReport({ ...emptyReport(), ...s.report }, "fr")
          : (s.description ?? null),
        typeId: type(s.type).id,
        priorityId: priority(s.priority).id,
        columnId: col(s.column).id,
        rank: ranks.get(s.column)![i],
        reporterId: reporter.id,
        assigneeId: s.assignee ?? null,
        sprintId: s.sprint ? sprint(s.sprint).id : null,
        componentId: s.component ? component(s.component).id : null,
        // Module propre : jamais renseigné en présence d'un composant (le module
        // effectif est alors celui du composant) - invariant garanti ici aussi.
        moduleId: !s.component && s.module ? mod(s.module).id : null,
        labels: s.labels
          ? { create: s.labels.map((n) => ({ labelId: label(n).id })) }
          : undefined,
      },
    });
    ticketIdByTitle.set(s.title, ticket.id);
  }
  await prisma.project.update({ where: { id: project.id }, data: { ticketSeq: number } });

  // --- Commentaires (démontrent le fil de discussion par ticket) ---
  const ticketByTitle = (title: string) => ticketIdByTitle.get(title)!;
  await prisma.comment.createMany({
    data: [
      {
        ticketId: ticketByTitle("Le drag & drop clavier ne fonctionne pas sur Firefox"),
        authorId: reporter.id,
        body: "Reproduit sur Firefox 128 : la carte reste \"flottante\" après Espace + flèche. Ça fonctionne bien sur Chrome.",
      },
      {
        ticketId: ticketByTitle("Le drag & drop clavier ne fonctionne pas sur Firefox"),
        authorId: admin.id,
        body: "Merci, je regarde ça en priorité pour ce sprint - probablement lié à `dnd-kit` et aux événements clavier de Firefox.",
      },
      {
        ticketId: ticketByTitle("Mon mot de passe oublié ne reçoit pas d'e-mail"),
        authorId: reporter.id,
        body: "Aucun e-mail reçu après \"Mot de passe oublié\", ni dans les spams.",
      },
      {
        ticketId: ticketByTitle("Mon mot de passe oublié ne reçoit pas d'e-mail"),
        authorId: admin.id,
        body: "Mailjet n'est pas configuré sur cet environnement de démo (fonctionnalité désactivée proprement). À vérifier une fois les clés en place.",
      },
    ],
  });

  // --- Wiki : trois sections prédéfinies, puis le contenu rangé dessous ---
  //
  // Une section EST une page racine ; `WikiSection` ne fait que désigner
  // laquelle. L'appartenance des autres pages ne se stocke pas, elle se lit en
  // remontant les ancêtres (cf. src/lib/wiki-tree.ts) - c'est pourquoi il suffit
  // ici de poser le bon `parentId`.
  const sectionPages: Record<"SPEC" | "MEETING" | "IMPLEMENTATION", string> = {
    SPEC: "",
    MEETING: "",
    IMPLEMENTATION: "",
  };
  for (const section of [
    {
      kind: "SPEC" as const,
      title: "Spécifications",
      content:
        "Ce que le produit doit faire, tel qu'on s'y engage. Chaque spécification se publie en versions figées, citables depuis un ticket : une version publiée ne change plus.",
    },
    {
      kind: "MEETING" as const,
      title: "Réunions",
      content:
        "Les comptes rendus, un par réunion, classés par date. Un compte rendu ne se réécrit pas : ce qui a été dit ce jour-là le reste.",
    },
    {
      kind: "IMPLEMENTATION" as const,
      title: "Implémentation",
      content:
        "Comment le produit est fait : architecture, décisions techniques, procédures. Contrairement aux deux autres, cette documentation n'a qu'un seul état valable - le plus récent.",
    },
  ]) {
    const page = await prisma.wikiPage.create({
      data: {
        projectId: project.id,
        title: section.title,
        slug: slugify(section.title),
        content: section.content,
        authorId: admin.id,
      },
    });
    await prisma.wikiSection.create({
      data: { projectId: project.id, kind: section.kind, rootPageId: page.id },
    });
    sectionPages[section.kind] = page.id;
  }

  const guide = await prisma.wikiPage.create({
    data: {
      projectId: project.id,
      parentId: sectionPages.SPEC,
      title: "Guide du projet",
      slug: slugify("Guide du projet"),
      content:
        "Bienvenue sur le wiki du projet **RKN**. Cette page centralise la documentation " +
        "libre de l'équipe (conventions, procédures). Voir aussi RKN-9.",
      authorId: admin.id,
    },
  });
  const conventions = await prisma.wikiPage.create({
    data: {
      projectId: project.id,
      parentId: guide.id,
      title: "Conventions de nommage des tickets",
      slug: slugify("Conventions de nommage des tickets"),
      content:
        "Titres à l'impératif, en français, < 80 caractères. Exemple : \"Ajouter un export CSV de la vue liste\".",
      authorId: admin.id,
    },
  });

  // --- Compte rendu de réunion : démontre thèmes, natures d'items et actions ---
  // La structure vit dans le Markdown (cf. src/lib/meeting-minutes.ts) : un thème
  // par titre de niveau 2, un point par puce, « (action) » ou une case à cocher
  // pour ce qui engage. Les lettres A/B et les références A-01… sont déduites à
  // l'affichage, rien de tout cela n'est stocké.
  const reunion = await prisma.wikiPage.create({
    data: {
      projectId: project.id,
      parentId: sectionPages.MEETING,
      title: "Réunion hebdomadaire du 28 juillet",
      // Un compte rendu porte sa date en tête d'adresse (cf. wiki.service.ts).
      slug: `2026-07-28-${slugify("Réunion hebdomadaire du 28 juillet")}`,
      meetingDate: new Date("2026-07-28"),
      authorId: admin.id,
      content: [
        "Présents : Admin Rakoon, Rémy Rapporteur.",
        "Ordre du jour : avancement du tableau Kanban et préparation du lot 2.",
        "",
        "## Tableau Kanban",
        "",
        "- (info) La limite de WIP par colonne est en production depuis lundi.",
        "- (action) Corriger le déplacement au clavier sur Firefox, cf. RKN-2.",
        "- (action) Documenter les raccourcis du tableau dans le wiki.",
        "",
        "## Préparation du lot 2",
        "",
        "- (info) Le périmètre est arrêté : notifications e-mail et export CSV.",
        "- [ ] Chiffrer l'export CSV avant vendredi.",
        "- (info) La recette client est calée au 12 août.",
        "",
        "## Divers",
        "",
        "- (info) Prochaine réunion le 4 août, même heure.",
      ].join("\n"),
    },
  });

  // Révision initiale de chaque page : l'application en écrit une à chaque
  // enregistrement, le seed passant outre les services doit le faire lui-même -
  // sans quoi la démo montrerait un historique vide sur des pages existantes.
  // Une page d'implémentation CONSÉQUENTE : sans elle, on ne verrait ni le
  // sommaire à l'œuvre, ni les encarts, ni la coloration du code - trois choses
  // qu'une page de trois lignes ne peut pas montrer.
  const implementation = await prisma.wikiPage.create({
    data: {
      projectId: project.id,
      parentId: sectionPages.IMPLEMENTATION,
      title: "Architecture du stockage des pièces jointes",
      slug: slugify("Architecture du stockage des pièces jointes"),
      content: [
        "Les pièces jointes ne transitent jamais par la base : seules leurs métadonnées y figurent. Cette page décrit où vont les fichiers, comment ils sont servis, et ce qu'il faut savoir avant d'y toucher.",
        "",
        "> [!NOTE]",
        "> Deux espaces de stockage cohabitent : celui des tickets (`attachments/`) et celui du wiki (`wiki/`). Les routes vérifient le préfixe, ce qui interdit qu'une clé de l'un serve à écrire dans l'autre.",
        "",
        "## Où vivent les fichiers",
        "",
        "Un stockage compatible S3 - MinIO en développement, S3 en production. À défaut de configuration, l'application se replie sur le dossier `.uploads`.",
        "",
        "```bash",
        "# Développement : MinIO en conteneur",
        "docker run -d -p 9000:9000 -p 9001:9001 \\",
        "  -e MINIO_ROOT_USER=artemis \\",
        "  -e MINIO_ROOT_PASSWORD=artemis-secret \\",
        "  minio/minio server /data --console-address ':9001'",
        "```",
        "",
        "> [!WARNING]",
        "> Le repli disque n'est PAS persistant en conteneur : un redéploiement efface les fichiers. Il dépanne en développement, jamais en production.",
        "",
        "### Variables attendues",
        "",
        "| Variable | Rôle | Obligatoire |",
        "| --- | --- | --- |",
        "| `S3_ENDPOINT` | Adresse du service | oui |",
        "| `S3_BUCKET` | Compartiment | oui |",
        "| `S3_ACCESS_KEY_ID` | Identifiant | oui |",
        "| `S3_SECRET_ACCESS_KEY` | Secret | oui |",
        "| `S3_REGION` | Région | non (`us-east-1`) |",
        "",
        "Les quatre premières doivent être présentes ensemble : `isStorageConfigured()` ne renvoie vrai qu'à cette condition, et bascule sinon sur le disque.",
        "",
        "## Comment ils sont servis",
        "",
        "L'application ne sert jamais un fichier elle-même : elle signe une URL temporaire et laisse le stockage répondre. Voir RKN-7.",
        "",
        "```typescript",
        "// Route de service : une redirection, pas un flux qui traverse l'application.",
        "export async function GET(_req: Request, { params }: Ctx) {",
        "  const file = await getWikiAttachmentWithProject((await params).id);",
        "  if (!file) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 });",
        "  if (!(await canAccess(user, file.page.projectId))) {",
        "    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 });",
        "  }",
        "  redirect(await presignDownload(file.storageKey));",
        "}",
        "```",
        "",
        "### Pourquoi une adresse stable malgré tout",
        "",
        "Une page cite ses images par `/api/wiki-files/<id>`, jamais par l'URL signée : celle-ci expire en quelques minutes, et le texte enregistré afficherait des images cassées pour toujours.",
        "",
        "> [!IMPORTANT]",
        "> C'est la seule décision de cette page qu'on ne pourrait pas rattraper après coup. Une fois des URL signées écrites dans le contenu de centaines de pages, il faudrait toutes les réécrire - en espérant que les objets existent encore.",
        "",
        "#### Ordre de résolution",
        "",
        "1. La route reçoit un identifiant de pièce jointe.",
        "2. Elle vérifie la session, puis l'accès au projet de la page porteuse.",
        "3. Elle signe une URL fraîche et redirige.",
        "",
        "## Nettoyage",
        "",
        "Retirer une pièce jointe efface la ligne PUIS l'objet. L'ordre compte : si l'effacement de l'objet échoue, il ne reste qu'un fichier orphelin - moins grave qu'une ligne pointant vers un objet disparu.",
        "",
        "```sql",
        "-- Pièces jointes de plus d'un an, jamais citées par leur page.",
        "SELECT a.id, a.filename, a.\"createdAt\"",
        "FROM \"WikiAttachment\" a",
        "JOIN \"WikiPage\" p ON p.id = a.\"pageId\"",
        "WHERE a.\"createdAt\" < now() - interval '1 year'",
        "  AND p.content NOT LIKE '%' || a.id || '%'",
        "ORDER BY a.\"createdAt\";",
        "```",
        "",
        "## Limites connues",
        "",
        "- 20 Mo par fichier, contrôlé au dépôt comme à l'enregistrement.",
        "- Les types exécutables sont refusés ; la liste est rejouée côté serveur.",
        "- Aucune déduplication : deux dépôts du même fichier occupent deux objets.",
        "- Aucune analyse antivirus. À prévoir si le wiki s'ouvre hors de l'équipe.",
      ].join("\n"),
      authorId: admin.id,
    },
  });

  // La page d'implémentation DÉCLARE son sujet : c'est ce lien qui la fait
  // apparaître sur la fiche du composant et sur les tickets qui le concernent.
  // Sans lui, la démo montrerait la mécanique sans montrer ce qu'elle rapporte.
  const champPiecesJointes = await prisma.component.findFirst({
    where: { projectId: project.id, name: "Champ pièces jointes" },
    select: { id: true },
  });
  if (champPiecesJointes) {
    await prisma.wikiPageComponent.create({
      data: { pageId: implementation.id, componentId: champPiecesJointes.id },
    });
  }

  const wikiPages = [guide, conventions, reunion, implementation];

  // Texte de recherche : le seed écrit en base sans passer par les services, il
  // doit donc le poser lui-même - sinon la démo livrerait un wiki introuvable.
  for (const page of wikiPages) {
    await prisma.wikiPage.update({
      where: { id: page.id },
      data: { searchText: buildSearchText(page.title, page.content) },
    });
  }
  await prisma.wikiRevision.createMany({
    data: wikiPages.map((page) => ({
      pageId: page.id,
      title: page.title,
      content: page.content,
      authorId: admin.id,
    })),
  });

  // --- Spécification : le sous-arbre « Guide du projet » traité comme un
  // document unique et versionnable, avec une première version publiée. ---
  const specPackage = await prisma.specPackage.create({
    data: { projectId: project.id, rootPageId: guide.id },
  });
  // L'ordre et les chemins sont calculés par le MÊME module que l'application :
  // la démo produit donc exactement la forme qu'une publication réelle produit.
  const specEntries = specSubtree(
    wikiPages.map((page) => ({
      id: page.id,
      title: page.title,
      parentId: page.parentId,
      content: page.content,
    })),
    guide.id,
  );
  await prisma.specVersion.create({
    data: {
      packageId: specPackage.id,
      number: 1,
      label: "Socle initial",
      note: "Première mise sous version du guide projet et de ses conventions.",
      publishedById: admin.id,
      pages: {
        create: specEntries.map((entry) => ({
          pageId: entry.page.id,
          title: entry.page.title,
          content: entry.page.content,
          path: entry.path,
          order: entry.order,
        })),
      },
    },
  });

  console.log(
    `Seed OK : projet RKN, ${samples.length} tickets, ${DEFAULT_MODULES.length} modules, ` +
      `${DEFAULT_COMPONENTS.length} composants, 3 sprints, ` +
      `3 sections et ${wikiPages.length} pages wiki.\n` +
      `  Admin      : admin@rakoon.io / ***MOT-DE-PASSE-RETIRE*** (accès à tous les projets)\n` +
      `  Rapporteur : rapporteur@rakoon.io / ***MOT-DE-PASSE-RETIRE*** (membre de RKN)\n` +
      `  Assistant  : bot@rakoon.io (compte de service MCP, membre de RKN)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
