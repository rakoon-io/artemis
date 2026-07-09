import { prisma } from "@/lib/db";

/** Service Label — accès données pur. Unicité `(projectId, name)` garantie en base. */

export function listLabels(projectId: string) {
  return prisma.label.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
}

export interface CreateLabelServiceInput {
  projectId: string;
  name: string;
  color: string;
}

export function createLabel(input: CreateLabelServiceInput) {
  return prisma.label.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      color: input.color,
    },
  });
}

export function deleteLabel(id: string) {
  return prisma.label.delete({ where: { id } });
}
