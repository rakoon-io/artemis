import type { Metadata } from "next";
import type { EmailStatus } from "@prisma/client";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getDictionary } from "@/i18n/server";
import { getEmailLog } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "E-mails · Artemis" };

/**
 * Journal des e-mails (RSC), réservé aux administrateurs : suivi de tous les
 * envois (notifications, invitations, réinitialisations), avec leur statut.
 */
export default async function EmailsPage() {
  const session = await auth();
  const t = await getDictionary();

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.restrictedTitle}</CardTitle>
            <CardDescription>
              {t.admin.emails.restrictedDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const emails = await getEmailLog(200);

  const STATUS: Record<
    EmailStatus,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    SENT: { label: t.admin.emails.statusSent, variant: "default" },
    FAILED: { label: t.admin.emails.statusFailed, variant: "destructive" },
    DISABLED: { label: t.admin.emails.statusDisabled, variant: "secondary" },
  };

  const typeLabels: Record<string, string> = {
    comment: t.admin.emails.typeComment,
    assignment: t.admin.emails.typeAssignment,
    invite: t.admin.emails.typeInvite,
    reset: t.admin.emails.typeReset,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.admin.emails.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.admin.emails.subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {emails.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {t.admin.emails.empty}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">
                      {t.admin.emails.colDate}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t.admin.emails.colRecipient}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t.admin.emails.colSubject}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t.admin.emails.colType}
                    </th>
                    <th className="px-4 py-2 font-medium">
                      {t.admin.emails.colStatus}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {emails.map((email) => (
                    <tr key={email.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {new Date(email.createdAt).toLocaleString("fr-FR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-2">
                        {email.to}
                      </td>
                      <td className="max-w-[20rem] truncate px-4 py-2">
                        {email.subject}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {typeLabels[email.type] ?? email.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Badge variant={STATUS[email.status].variant}>
                          {STATUS[email.status].label}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
