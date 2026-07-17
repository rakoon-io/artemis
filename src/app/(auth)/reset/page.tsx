import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestResetForm } from "@/components/auth/request-reset-form";

export const metadata: Metadata = { title: "Mot de passe oublié · Artemis" };

/** Page publique de demande de réinitialisation de mot de passe. */
export default function ResetPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
        <CardDescription>
          Saisissez votre e-mail : nous vous enverrons un lien pour définir un
          nouveau mot de passe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RequestResetForm />
      </CardContent>
    </Card>
  );
}
