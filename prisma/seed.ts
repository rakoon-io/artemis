import { PrismaClient, Role, SprintState } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateNKeysBetween } from "fractional-indexing";

const prisma = new PrismaClient();

// Jeux par défaut — alignés sur project.service.ts (order = index dans le tableau).
const DEFAULT_TICKET_TYPES = [
  { name: "Bug", color: "#EF4444" },
  { name: "Fonctionnalité", color: "#6366F1" },
  { name: "Tâche", color: "#0EA5E9" },
  { name: "Corvée", color: "#64748B" },
];
const DEFAULT_TICKET_PRIORITIES = [
  { name: "Basse", color: "#94A3B8" },
  { name: "Moyenne", color: "#0EA5E9" },
  { name: "Haute", color: "#F59E0B" },
  { name: "Urgente", color: "#EF4444" },
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
      passwordHash: await bcrypt.hash("admin1234", 12),
    },
  });
  const reporter = await prisma.user.upsert({
    where: { email: "rapporteur@rakoon.io" },
    update: {},
    create: {
      email: "rapporteur@rakoon.io",
      name: "Rémy Rapporteur",
      role: Role.REPORTER,
      passwordHash: await bcrypt.hash("rapporteur1234", 12),
    },
  });

  // --- Projet de démonstration (idempotent) ---
  if (await prisma.project.findUnique({ where: { key: "RKN" } })) {
    console.log("Seed déjà présent (projet RKN) — rien à faire.");
    return;
  }

  const colNames = ["Backlog", "À faire", "En cours", "En revue", "Terminé"];
  const project = await prisma.project.create({
    data: {
      key: "RKN",
      name: "Rakoon Tracker",
      description: "Projet de démonstration livré par le seed.",
      columns: { create: colNames.map((name, order) => ({ name, order })) },
      labels: {
        create: [
          { name: "bug", color: "#EF4444" },
          { name: "feature", color: "#6366F1" },
          { name: "urgent", color: "#F59E0B" },
        ],
      },
      ticketTypes: {
        create: DEFAULT_TICKET_TYPES.map((t, order) => ({ ...t, order })),
      },
      ticketPriorities: {
        create: DEFAULT_TICKET_PRIORITIES.map((p, order) => ({ ...p, order })),
      },
      sprints: {
        create: [
          {
            name: "Sprint 1",
            goal: "Poser les fondations produit",
            state: SprintState.ACTIVE,
            startDate: new Date("2026-07-01"),
            endDate: new Date("2026-07-15"),
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
    },
  });

  const col = (name: string) => project.columns.find((c) => c.name === name)!;
  const label = (name: string) => project.labels.find((l) => l.name === name)!;
  const type = (name: string) => project.ticketTypes.find((t) => t.name === name)!;
  const priority = (name: string) =>
    project.ticketPriorities.find((p) => p.name === name)!;
  const sprint = project.sprints[0];

  const samples: Array<{
    title: string;
    type: string;
    priority: string;
    column: string;
    labels?: string[];
    assignee?: string;
    inSprint?: boolean;
  }> = [
    { title: "Coller une image du presse-papier à la création", type: "Fonctionnalité", priority: "Haute", column: "En cours", labels: ["feature"], assignee: admin.id, inSprint: true },
    { title: "Le drag & drop clavier ne fonctionne pas sur Firefox", type: "Bug", priority: "Urgente", column: "À faire", labels: ["bug", "urgent"], inSprint: true },
    { title: "Ajouter la limite de WIP par colonne", type: "Fonctionnalité", priority: "Moyenne", column: "Backlog", labels: ["feature"] },
    { title: "Migrer le schéma Prisma en production", type: "Corvée", priority: "Moyenne", column: "En revue", assignee: admin.id, inSprint: true },
    { title: "Filtrer la vue liste par sprint", type: "Tâche", priority: "Basse", column: "Backlog" },
    { title: "Erreur 500 à la suppression d'une colonne pleine", type: "Bug", priority: "Haute", column: "À faire", labels: ["bug"] },
    { title: "Configurer MinIO pour les pièces jointes", type: "Corvée", priority: "Moyenne", column: "Terminé", assignee: admin.id },
    { title: "Thème sombre : contraste insuffisant sur les badges", type: "Bug", priority: "Basse", column: "En cours", labels: ["bug"] },
  ];

  // Rangs par colonne
  const perColumn = new Map<string, number>();
  for (const s of samples) perColumn.set(s.column, (perColumn.get(s.column) ?? 0) + 1);
  const ranks = new Map<string, string[]>();
  for (const [name, count] of perColumn) ranks.set(name, generateNKeysBetween(null, null, count));
  const idx = new Map<string, number>();

  let number = 0;
  for (const s of samples) {
    number += 1;
    const i = idx.get(s.column) ?? 0;
    idx.set(s.column, i + 1);
    await prisma.ticket.create({
      data: {
        projectId: project.id,
        number,
        key: `RKN-${number}`,
        title: s.title,
        typeId: type(s.type).id,
        priorityId: priority(s.priority).id,
        columnId: col(s.column).id,
        rank: ranks.get(s.column)![i],
        reporterId: reporter.id,
        assigneeId: s.assignee ?? null,
        sprintId: s.inSprint ? sprint.id : null,
        labels: s.labels
          ? { create: s.labels.map((n) => ({ labelId: label(n).id })) }
          : undefined,
      },
    });
  }
  await prisma.project.update({ where: { id: project.id }, data: { ticketSeq: number } });

  console.log(
    `Seed OK : projet RKN, ${samples.length} tickets.\n` +
      `  Admin      : admin@rakoon.io / admin1234\n` +
      `  Rapporteur : rapporteur@rakoon.io / rapporteur1234`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
