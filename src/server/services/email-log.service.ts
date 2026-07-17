import type { EmailStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Journal des e-mails - enregistrement et lecture (suivi des envois). */

export interface RecordEmailInput {
  to: string;
  subject: string;
  type: string;
  status: EmailStatus;
  error?: string | null;
}

export function recordEmail(input: RecordEmailInput) {
  return prisma.emailLog.create({
    data: {
      to: input.to,
      subject: input.subject,
      type: input.type,
      status: input.status,
      error: input.error ?? null,
    },
  });
}

/** E-mails récents (plus récents d'abord). */
export function listEmails(limit = 100) {
  return prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
