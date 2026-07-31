import type { Metadata } from "next";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { BRAND_COLOR, envInstance } from "@/lib/instance";
import {
  getInstance,
  getStoredSettings,
} from "@/server/services/settings.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InstanceSettingsForm } from "@/components/admin/instance-settings-form";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Cette instance" };

/**
 * APPARENCE DE CETTE INSTANCE - réservée aux administrateurs.
 *
 * Le réglage est GLOBAL : il change ce que voient tous les utilisateurs, et
 * jusqu'à l'icône de l'application installée sur leur machine. Il n'a donc pas
 * sa place dans les paramètres d'un projet, où l'on ne règle que ce projet.
 */
export default async function InstancePage() {
  const session = await auth();
  const t = await getDictionary();

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.restrictedTitle}</CardTitle>
            <CardDescription>
              {t.admin.instance.restrictedDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const [stored, effective] = await Promise.all([
    getStoredSettings(),
    getInstance(),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.admin.instance.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.admin.instance.subtitle}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.admin.instance.cardTitle}</CardTitle>
          <CardDescription>{t.admin.instance.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <InstanceSettingsForm
            // Ce qui est ENREGISTRÉ, et non ce qui s'applique : le champ doit
            // rester vide quand la valeur vient de l'environnement, sinon le
            // premier enregistrement figerait en base un réglage que
            // l'administrateur n'a jamais choisi.
            label={stored?.instanceLabel ?? ""}
            color={stored?.instanceColor ?? ""}
            // Ce qui prendrait le relais si l'on vidait les champs : c'est
            // l'environnement, puis le défaut - jamais la valeur enregistrée,
            // que l'on est précisément en train d'effacer.
            fallbackLabel={envInstance.label}
            fallbackColor={envInstance.color}
            token={effective.token}
            envLabel={envInstance.label}
            envColor={
              // On ne signale l'héritage que s'il vient VRAIMENT de
              // l'environnement : la couleur de marque est le défaut du code,
              // pas un réglage de déploiement.
              envInstance.color === BRAND_COLOR ? null : envInstance.color
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
