import { z } from "zod";
import { ComponentKind, Role, TicketTemplate } from "@prisma/client";

/** Schémas Zod partagés client/serveur - validation à chaque frontière. */

/** Couleur hexadécimale #RRGGBB - partagée par labels, types et priorités. */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale (#RRGGBB)");

export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1, "Nom requis").max(80),
  email: z.string().email("E-mail invalide"),
  password: z.string().min(8, "8 caractères minimum").max(200),
});

export const createProjectSchema = z.object({
  name: z.string().min(1, "Nom requis").max(80),
  key: z
    .string()
    .regex(/^[A-Z]{2,6}$/, "2 à 6 lettres majuscules (ex : RKN)"),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Nom requis").max(80),
  description: z.string().max(500).optional().nullable(),
  accentColor: hex.nullable().optional(),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(1, "Nom requis").max(80),
  email: z.string().email("E-mail invalide"),
  // Optionnel : vide/absent => l'utilisateur definit son mot de passe via un lien.
  password: z.string().min(8, "8 caractères minimum").max(200).optional(),
  role: z.nativeEnum(Role),
});

/** Definition du mot de passe via un lien de premiere connexion (jeton). */
export const setPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "8 caractères minimum").max(200),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

export const projectMemberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

export const createTicketSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, "Titre requis").max(200),
  description: z.string().max(20000).optional().nullable(),
  typeId: z.string().min(1).optional(),
  priorityId: z.string().min(1).optional(),
  // Composant concerné (facultatif) : `null` = aucun composant. `.min(1)` est
  // indispensable : une chaîne vide passerait le garde-fou de cohérence projet
  // du service (qui teste la véracité) et partirait telle quelle en base, où
  // elle violerait la clé étrangère `Ticket_componentId_fkey`.
  componentId: z.string().min(1).optional().nullable(),
  // Module propre du ticket : n'est retenu que s'il n'y a PAS de composant
  // (le service impose l'invariant). `null` = aucun module.
  moduleId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional().default([]),
});

export const updateTicketSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(20000).optional().nullable(),
  typeId: z.string().min(1).optional(),
  priorityId: z.string().min(1).optional(),
  // `undefined` = ne pas toucher ; `null` = détacher. Voir createTicketSchema
  // pour la raison du `.min(1)`.
  componentId: z.string().min(1).optional().nullable(),
  moduleId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

/** Génération de tickets à partir d'un texte libre collé (intégration Mistral). */
export const generateTicketsFromTextSchema = z.object({
  projectId: z.string().min(1),
  text: z
    .string()
    .trim()
    .min(1, "Collez un texte à analyser.")
    .max(20000, "Texte trop long (20000 caractères maximum)."),
  // Contexte / consignes libres pour orienter la génération (facultatif).
  context: z
    .string()
    .trim()
    .max(4000, "Contexte trop long (4000 caractères maximum).")
    .optional()
    .nullable(),
});

/** Un brouillon de ticket, tel que validé dans l'écran de revue (avant création). */
export const ticketDraftSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200),
  description: z.string().max(20000).optional().nullable(),
  typeId: z.string().min(1).optional().nullable(),
  priorityId: z.string().min(1).optional().nullable(),
  componentId: z.string().min(1).optional().nullable(),
});

/** Création en lot des tickets validés depuis l'écran de revue. */
export const createTicketsFromDraftsSchema = z.object({
  projectId: z.string().min(1),
  tickets: z
    .array(ticketDraftSchema)
    .min(1, "Sélectionnez au moins un ticket à créer.")
    .max(50, "Trop de tickets à créer d'un seul coup."),
});

export const moveTicketSchema = z.object({
  ticketId: z.string().min(1),
  columnId: z.string().min(1),
  beforeRank: z.string().nullable().optional(),
  afterRank: z.string().nullable().optional(),
});

export const createColumnSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(40),
  wipLimit: z.number().int().positive().max(999).optional().nullable(),
});

export const updateColumnSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40).optional(),
  wipLimit: z.number().int().positive().max(999).optional().nullable(),
});

export const reorderColumnsSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string().min(1)).min(1),
});

export const createSprintSchema = z
  .object({
    projectId: z.string().min(1),
    name: z.string().min(1).max(80),
    goal: z.string().max(500).optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  })
  .refine(
    (d) =>
      !d.startDate || !d.endDate || new Date(d.endDate) > new Date(d.startDate),
    { message: "La date de fin doit être postérieure au début", path: ["endDate"] },
  )
  .refine((d) => (d.startDate ? !!d.endDate : !d.endDate), {
    message: "Renseigner les deux dates, ou aucune",
    path: ["endDate"],
  });

export const createLabelSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale (#RRGGBB)"),
});

// --- Types de tickets (configurables par projet) ---

/**
 * Modèle de ticket imposé par le type : quelles rubriques la description doit
 * comporter (cf. `@/lib/ticket-template`). Absent = `NONE`, soit le
 * comportement historique : description entièrement libre.
 */
export const ticketTemplateSchema = z.nativeEnum(TicketTemplate);

export const createTicketTypeSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(40),
  color: hex,
  template: ticketTemplateSchema.optional(),
});

export const updateTicketTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40).optional(),
  color: hex.optional(),
  template: ticketTemplateSchema.optional(),
});

export const reorderTicketTypesSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

// --- Priorités de tickets (configurables par projet) ---
export const createTicketPrioritySchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(40),
  color: hex,
});

export const updateTicketPrioritySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40).optional(),
  color: hex.optional(),
});

export const reorderTicketPrioritiesSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

// --- Modules fonctionnels (regroupent les composants, par projet) ---
export const createModuleSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(60),
  description: z
    .string()
    .trim()
    .max(500, "Description trop longue (500 caractères maximum).")
    .optional()
    .nullable()
    .transform((v) => v || null),
  color: hex,
});

export const updateModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(60).optional(),
  // `undefined` = ne pas toucher à la description ; "" ou `null` = l'effacer.
  description: z
    .string()
    .trim()
    .max(500, "Description trop longue (500 caractères maximum).")
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v || null)),
  color: hex.optional(),
});

export const reorderModulesSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

// --- Composants applicatifs (catalogue configurable par projet) ---
/** Nature d'un composant : page, composant réutilisable ou service. */
export const componentKindSchema = z.nativeEnum(ComponentKind);

export const createComponentSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(60),
  kind: componentKindSchema,
  // Module de rattachement (facultatif) : `null` = composant transverse.
  moduleId: z.string().min(1).optional().nullable(),
  // Contexte libre du composant (transmis à l'IA) : "" est normalisé en null.
  description: z
    .string()
    .trim()
    .max(500, "Description trop longue (500 caractères maximum).")
    .optional()
    .nullable()
    .transform((v) => v || null),
  color: hex,
});

export const updateComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Nom requis").max(60).optional(),
  kind: componentKindSchema.optional(),
  // `undefined` = ne pas toucher ; `null` = détacher du module.
  moduleId: z.string().min(1).optional().nullable(),
  // `undefined` = ne pas toucher à la description ; "" ou `null` = l'effacer.
  description: z
    .string()
    .trim()
    .max(500, "Description trop longue (500 caractères maximum).")
    .optional()
    .nullable()
    .transform((v) => (v === undefined ? undefined : v || null)),
  color: hex.optional(),
});

export const reorderComponentsSchema = z.object({
  projectId: z.string().min(1),
  orderedIds: z.array(z.string()).min(1),
});

export const createCommentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().min(1, "Commentaire vide").max(5000),
});

export const presignSchema = z.object({
  ticketId: z.string().min(1).optional(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "10 Mo maximum"),
});

// parentId : "" / null / undefined -> null (page racine) ; sinon l'id du parent.
const wikiParentId = z
  .string()
  .nullish()
  .transform((v) => v || null);

export const createWikiPageSchema = z.object({
  projectId: z.string().min(1),
  parentId: wikiParentId,
  title: z.string().trim().min(1, "Titre requis").max(200),
  content: z.string().max(50000, "Contenu trop long").default(""),
});

// --- Paquets de spécifications (sous-arbres de wiki versionnés) ---

export const markSpecSchema = z.object({
  projectId: z.string().min(1),
  rootPageId: z.string().min(1),
});

/**
 * Publication d'une version. Le libellé et la note sont facultatifs et
 * normalisés : une chaîne vide devient `null`, sinon la version afficherait
 * « v3 — » et la base porterait des blancs se faisant passer pour du contenu.
 */
export const publishSpecVersionSchema = z.object({
  packageId: z.string().min(1),
  label: z
    .string()
    .trim()
    .max(60)
    .nullish()
    .transform((v) => v || null),
  note: z
    .string()
    .trim()
    .max(2000)
    .nullish()
    .transform((v) => v || null),
});

export const updateWikiPageSchema = z.object({
  id: z.string().min(1),
  parentId: wikiParentId,
  title: z.string().trim().min(1, "Titre requis").max(200),
  content: z.string().max(50000, "Contenu trop long").default(""),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateSprintInput = z.infer<typeof createSprintSchema>;
