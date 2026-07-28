import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Bannière affichée sur `/login` en mode démo (`DEMO_MODE=true`) : identifiants
 * des comptes créés par le seed de base (voir `prisma/seed.ts`), pour permettre
 * à un visiteur de se connecter sans compte préalable.
 */
export function DemoCredentialsCard() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">Démo</Badge>
          Environnement de démonstration
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-1.5 text-sm text-muted-foreground">
        <p>Connectez-vous avec l&apos;un de ces comptes de démonstration :</p>
        <div className="grid gap-1 rounded-md bg-muted p-3 font-mono text-xs">
          <div>
            <span className="text-foreground">Admin</span> — admin@rakoon.io / ***MOT-DE-PASSE-RETIRE***
          </div>
          <div>
            <span className="text-foreground">Rapporteur</span> — rapporteur@rakoon.io /
            ***MOT-DE-PASSE-RETIRE***
          </div>
        </div>
        <p className="text-xs">
          Les données sont réinitialisées régulièrement au jeu de démonstration de
          base. La génération de tickets par IA est plafonnée à un budget quotidien.
        </p>
      </CardContent>
    </Card>
  );
}
