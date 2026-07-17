import type { Metadata } from "next";
import type { EmailStatus } from "@prisma/client";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
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

const STATUS: Record<
  EmailStatus,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  SENT: { label: "Envoyé", variant: "default" },
  FAILED: { label: "Échec", variant: "destructive" },
  DISABLED: { label: "Désactivé", variant: "secondary" },
};

const TYPE_LABELS: Record<string, string> = {
  comment: "Commentaire",
  assignment: "Assignation",
  invite: "Invitation",
  reset: "Réinitialisation",
};

/**
 * Journal des e-mails (RSC), réservé aux administrateurs : suivi de tous les
 * envois (notifications, invitations, réinitialisations), avec leur statut.
 */
export default async function EmailsPage() {
  const session = await auth();

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accès réservé aux administrateurs</CardTitle>
            <CardDescription>
              Le journal des e-mails n&apos;est accessible qu&apos;aux
              administrateurs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const emails = await getEmailLog(200);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">E-mails</h1>
        <p className="text-sm text-muted-foreground">
          Suivi de tous les e-mails envoyés par Artemis. Le statut «&nbsp;Désactivé&nbsp;»
          signifie que Mailjet n&apos;est pas configuré : l&apos;e-mail aurait été
          envoyé une fois les clés renseignées.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {emails.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Aucun e-mail pour l&apos;instant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Destinataire</th>
                    <th className="px-4 py-2 font-medium">Sujet</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                    <th className="px-4 py-2 font-medium">Statut</th>
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
                        {TYPE_LABELS[email.type] ?? email.type}
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
