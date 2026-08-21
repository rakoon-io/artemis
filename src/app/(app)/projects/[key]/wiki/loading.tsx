/**
 * CE QU'ON VOIT PENDANT QU'UNE PAGE DE WIKI ARRIVE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX EFFETS, ET LE SECOND EST LE PLUS IMPORTANT
 *
 * L'effet visible : sans ce fichier, cliquer une page du plan ne produisait
 * RIEN. React garde l'ancienne page entière à l'écran - ancien titre, ancien
 * texte, ancienne ligne surlignée dans le plan - le temps de la requête, puis
 * tout bascule d'un coup. Aucun squelette, aucune barre de progression, et pas
 * même le témoin du navigateur, la navigation se faisant en `fetch`. Le seul
 * indice pendant l'attente était l'`aria-current` du plan, qui désignait encore
 * la page PRÉCÉDENTE - un signal qui ment.
 *
 * L'effet invisible, et le vrai gain : un `<Link>` en mode automatique ne
 * précharge une route dynamique que JUSQU'À LA PREMIÈRE FRONTIÈRE d'attente.
 * Sans `loading.tsx`, il n'y en avait aucune, donc rien à précharger : le survol
 * d'un lien ne mettait rien en réserve. Cette frontière donne au préchargement
 * quelque chose à viser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UN SQUELETTE, PAS UN TOURNIQUET
 *
 * On dessine la forme de ce qui arrive - les trois colonnes, leurs largeurs -
 * plutôt qu'un rond qui tourne au milieu du vide. La page ne saute pas quand le
 * contenu la remplace, et l'œil garde ses repères.
 */
export default function ChargementWiki() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="flex justify-end gap-2">
        <div className="h-9 w-36 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        {/* Le plan : mêmes largeurs que la colonne réelle, pour que rien ne
            se déplace latéralement à l'arrivée du contenu. */}
        <aside className="shrink-0 space-y-3 rounded-lg border bg-card p-3 md:w-64">
          <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-7 animate-pulse rounded-md bg-muted"
              // Des largeurs inégales : une pile de barres identiques se lit
              // comme un tableau, pas comme une liste de titres.
              style={{ width: `${[92, 74, 86, 60, 80, 68, 88][i]}%` }}
            />
          ))}
        </aside>

        <div className="min-w-0 flex-1 space-y-4 rounded-lg border p-4">
          <div className="h-7 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="space-y-2 pt-2">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-muted"
                style={{ width: `${[100, 96, 88, 100, 72, 94, 100, 62][i]}%` }}
              />
            ))}
          </div>
        </div>

        <aside className="hidden shrink-0 lg:block lg:w-64 xl:w-72">
          <div className="space-y-2 rounded-lg border p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded bg-muted"
                style={{ width: `${[88, 70, 82, 64, 76][i]}%` }}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
