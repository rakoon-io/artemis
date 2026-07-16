import { z } from "zod";
import { Role } from "@prisma/client";

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
  password: z.string().min(8, "8 caractères minimum").max(200),
  role: z.nativeEnum(Role),
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
  assigneeId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
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
export const createTicketTypeSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(40),
  color: hex,
});

export const updateTicketTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(40).optional(),
  color: hex.optional(),
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

export const updateWikiPageSchema = z.object({
  id: z.string().min(1),
  parentId: wikiParentId,
  title: z.string().trim().min(1, "Titre requis").max(200),
  content: z.string().max(50000, "Contenu trop long").default(""),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateSprintInput = z.infer<typeof createSprintSchema>;
