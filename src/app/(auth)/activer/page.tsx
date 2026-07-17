import type { Metadata } from "next";
import Link from "next/link";

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

  if (!token || !context) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lien invalide ou expiré</CardTitle>
          <CardDescription>
            Ce lien de première connexion n&apos;est plus valable. Demandez-en un
            nouveau à un administrateur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Définir votre mot de passe</CardTitle>
        <CardDescription>
          Choisissez un mot de passe pour activer le compte {context.email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetPasswordForm token={token} email={context.email} />
      </CardContent>
    </Card>
  );
}
