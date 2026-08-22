"use client";

import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";

import type { StageCounts } from "@/server/services/activity.service";

/** Les trois étapes, dans l'ordre du flux : c'est cet ordre que la couleur dit. */
const STAGES = [
  { key: "todo", color: "var(--progress-todo)" },
  { key: "doing", color: "var(--progress-doing)" },
  { key: "done", color: "var(--progress-done)" },
] as const;

/**
 * Avancement de mes tâches : une barre empilée et ses compteurs.
 *
 * PART SUR UN TOUT, en trois étapes ordonnées : la barre empilée le montre
 * d'un regard, là où trois nombres seuls demandent une soustraction mentale.
 *
 * LES CHIFFRES SONT TOUJOURS LÀ, sous la barre. Ce n'est pas une redite : le
 * palier le plus clair de la rampe n'atteint pas 3:1 sur la surface, et une
 * information portée par la seule couleur se perdrait pour qui la distingue
 * mal. Les libellés portent donc le sens, la barre en donne la proportion.
 */
export function ProgressBar({ counts }: { counts: StageCounts }) {
  const t = useDict();
  const total = counts.todo + counts.doing + counts.done;

  const labels: Record<(typeof STAGES)[number]["key"], string> = {
    todo: t.activity.todo,
    doing: t.activity.doing,
    done: t.activity.done,
  };

  return (
    <div className="space-y-2">
      {/*
        Un écart de 2px sépare les segments : deux paliers voisins d'une même
        teinte se toucheraient sinon sans frontière. Il laisse voir la PISTE
        (`bg-muted`), et non la carte - c'est elle qui court derrière la barre.

        `aria-hidden` : la légende juste dessous énonce déjà les trois nombres.
        Doubler l'information la ferait lire deux fois de suite.
      */}
      <div
        className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
        aria-hidden
      >
        {total > 0 &&
          STAGES.map(({ key, color }) => {
            const value = counts[key];
            if (value === 0) return null;
            return (
              <div
                key={key}
                className="h-full min-w-0.5 rounded-full transition-[flex-basis]"
                style={{
                  // `flex-basis` et non `width` : les écarts sont retranchés de
                  // l'espace à répartir, au lieu de faire déborder la somme des
                  // largeurs - le navigateur retreignait sinon chaque segment,
                  // et les proportions dessinées n'étaient plus celles annoncées.
                  flexBasis: `${(value / total) * 100}%`,
                  flexGrow: 0,
                  flexShrink: 1,
                  backgroundColor: color,
                }}
              />
            );
          })}
      </div>

      <ul
        className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
        aria-label={fmt(t.activity.chartAria, {
          todo: counts.todo,
          doing: counts.doing,
          done: counts.done,
        })}
      >
        {STAGES.map(({ key, color }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="text-muted-foreground">{labels[key]}</span>
            <span className="font-medium tabular-nums">{counts[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
