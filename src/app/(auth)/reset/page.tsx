import type { Metadata } from "next";

import { getDictionary } from "@/i18n/server";
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
export default async function ResetPage() {
  const t = await getDictionary();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t.account.reset.title}</CardTitle>
        <CardDescription>{t.account.reset.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <RequestResetForm />
      </CardContent>
    </Card>
  );
}
