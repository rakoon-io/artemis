import {
  PrismaClient,
  Role,
  TicketType,
  Priority,
  SprintState,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateNKeysBetween } from "fractional-indexing";

const prisma = new PrismaClient();

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
    include: { columns: true, labels: true, sprints: true },
  });

  const col = (name: string) => project.columns.find((c) => c.name === name)!;
  const label = (name: string) => project.labels.find((l) => l.name === name)!;
  const sprint = project.sprints[0];

  const samples: Array<{
    title: string;
    type: TicketType;
    priority: Priority;
    column: string;
    labels?: string[];
    assignee?: string;
    inSprint?: boolean;
  }> = [
    { title: "Coller une image du presse-papier à la création", type: TicketType.FEATURE, priority: Priority.HIGH, column: "En cours", labels: ["feature"], assignee: admin.id, inSprint: true },
    { title: "Le drag & drop clavier ne fonctionne pas sur Firefox", type: TicketType.BUG, priority: Priority.URGENT, column: "À faire", labels: ["bug", "urgent"], inSprint: true },
    { title: "Ajouter la limite de WIP par colonne", type: TicketType.FEATURE, priority: Priority.MEDIUM, column: "Backlog", labels: ["feature"] },
    { title: "Migrer le schéma Prisma en production", type: TicketType.CHORE, priority: Priority.MEDIUM, column: "En revue", assignee: admin.id, inSprint: true },
    { title: "Filtrer la vue liste par sprint", type: TicketType.FEATURE, priority: Priority.LOW, column: "Backlog" },
    { title: "Erreur 500 à la suppression d'une colonne pleine", type: TicketType.BUG, priority: Priority.HIGH, column: "À faire", labels: ["bug"] },
    { title: "Configurer MinIO pour les pièces jointes", type: TicketType.CHORE, priority: Priority.MEDIUM, column: "Terminé", assignee: admin.id },
    { title: "Thème sombre : contraste insuffisant sur les badges", type: TicketType.BUG, priority: Priority.LOW, column: "En cours", labels: ["bug"] },
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
        type: s.type,
        priority: s.priority,
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
