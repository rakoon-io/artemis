import type { Metadata } from "next";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getDictionary } from "@/i18n/server";
import { getMembers } from "@/server/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserManager } from "@/components/settings/user-manager";

export const metadata: Metadata = { title: "Utilisateurs · Artemis" };

/**
 * Gestion **globale** des utilisateurs (RSC), réservée aux administrateurs. Un
 * compte et son rôle (Administrateur / Rapporteur) valent pour tout Artemis ;
 * l'accès à un projet donné se règle dans les paramètres du projet (onglet Membres).
 */
export default async function UsersPage() {
  const session = await auth();
  const t = await getDictionary();

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.restrictedTitle}</CardTitle>
            <CardDescription>
              {t.admin.users.restrictedDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const users = await getMembers();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.admin.users.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.users.subtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.users.cardTitle}</CardTitle>
          <CardDescription>
            {t.admin.users.cardDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserManager users={users} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
