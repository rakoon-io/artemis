import type { Metadata } from "next";
import Link from "next/link";

import { fmt } from "@/i18n";
import { getDictionary } from "@/i18n/server";
import { getSetupContext } from "@/server/services/setup-token.service";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata: Metadata = { title: "Première connexion · Artemis" };

/**
 * Page **publique** de première connexion : l'utilisateur définit son mot de
 * passe via un jeton reçu par lien. Le jeton est validé côté serveur ; s'il est
 * invalide ou expiré, un message l'indique.
 */
export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const context = token ? await getSetupContext(token) : null;
  const t = await getDictionary();

  if (!token || !context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.account.activate.invalidTitle}</CardTitle>
          <CardDescription>
            {t.account.activate.invalidDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">{t.account.backToLogin}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.account.activate.title}</CardTitle>
        <CardDescription>
          {fmt(t.account.activate.description, { email: context.email })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm token={token} email={context.email} />
      </CardContent>
    </Card>
  );
}
