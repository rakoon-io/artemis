import { instance } from "@/lib/instance";

/**
 * QUEL DÉPLOIEMENT AI-JE SOUS LES YEUX.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ICÔNE NE SUFFIT PAS
 *
 * Une icône distincte règle le dock et le sélecteur de fenêtres. Elle ne règle
 * pas le moment qui compte : celui où l'on est DANS l'application, sur le point
 * de supprimer une colonne, et où l'on se demande si c'est bien la recette. En
 * mode autonome il n'y a plus de barre d'adresse pour répondre - c'est
 * précisément ce qu'on a retiré en installant.
 *
 * D'où cette pastille, à côté de la marque, dans la couleur de l'instance.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELLE NE TEINTE QUE ELLE-MÊME
 *
 * La couleur de l'instance s'arrête à cette pastille et au décor du système
 * (`theme_color`). Elle ne repeint pas l'interface : `--primary` appartient déjà
 * au PROJET consulté, et deux teintes concurrentes finiraient par se contredire
 * - on ne saurait plus si l'orange dit « recette » ou « projet Quadrant ».
 *
 * Rien ne s'affiche sur l'instance de référence : c'est aux autres de se
 * signaler (cf. `src/lib/instance.ts`).
 */
export function InstanceBadge() {
  if (!instance.label) return null;

  return (
    <span
      // Le titre porte la même information : la pastille est courte par
      // nécessité, et l'étiquette peut avoir été tronquée à douze caractères.
      title={instance.name}
      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-white"
      style={{ backgroundColor: instance.color }}
    >
      {instance.label}
    </span>
  );
}
