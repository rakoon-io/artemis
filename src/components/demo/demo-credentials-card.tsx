import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";

/**
 * Bannière affichée sur `/login` en mode démo (`DEMO_MODE=true`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES IDENTIFIANTS NE SONT PAS DANS CE FICHIER
 *
 * Ils y étaient, et le dépôt est public : les mots de passe de la démonstration
 * - qui étaient aussi ceux de la production - se lisaient donc dans le code.
 * Ils viennent maintenant des mêmes variables que celles dont l'amorçage se
 * sert (`SEED_ADMIN_PASSWORD`, `SEED_REPORTER_PASSWORD`), ce qui garantit au
 * passage que la carte ne montre jamais un mot de passe périmé.
 *
 * Composant SERVEUR : ces valeurs ne partent donc pas dans le paquet du
 * navigateur autrement que dans le HTML de cette page - ce qui est le propos,
 * puisqu'une démonstration publie ses accès à dessein.
 *
 * Sans variable renseignée, la carte n'affiche AUCUN identifiant plutôt que
 * d'en inventer : mieux vaut un visiteur qui demande qu'un mot de passe faux.
 */
export function DemoCredentialsCard() {
  const comptes = [
    { role: "Admin", email: "admin@rakoon.io", password: env.SEED_ADMIN_PASSWORD },
    {
      role: "Rapporteur",
      email: "rapporteur@rakoon.io",
      password: env.SEED_REPORTER_PASSWORD,
    },
  ].filter((c) => !!c.password);

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Démo</Badge>
          Environnement de démonstration
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1.5 text-sm text-muted-foreground">
        {comptes.length > 0 && (
          <>
            <p>Connectez-vous avec l&apos;un de ces comptes de démonstration :</p>
            <div className="grid gap-1 rounded-md bg-muted p-3 font-mono text-xs">
              {comptes.map((c) => (
                <div key={c.email}>
                  <span className="text-foreground">{c.role}</span> — {c.email} /{" "}
                  {c.password}
                </div>
              ))}
            </div>
          </>
        )}
        <p className="text-xs">
          Les données sont réinitialisées régulièrement au jeu de démonstration de
          base. La génération de tickets par IA est plafonnée à un budget quotidien.
        </p>
      </CardContent>
    </Card>
  );
}
