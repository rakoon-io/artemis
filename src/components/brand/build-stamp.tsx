import { buildInfo, describeBuild } from "@/lib/build-info";
import { formatDateTime } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";

/**
 * VERSION ET DATE DU CODE, en pied de page.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS DU DÉCOR
 *
 * C'est la première question de tout signalement : « quelle version ? ». Sans
 * cela, il faut la demander, puis se fier à la réponse - alors qu'une capture
 * d'écran du bogue montre déjà le pied de page. L'empreinte du commit y figure
 * en clair pour cette raison précise : une infobulle ne s'imprime pas sur une
 * capture.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RENDU SERVEUR, DONC SANS PIÈGE D'HYDRATATION
 *
 * La date est mise en forme avec le fuseau d'affichage, qui peut différer entre
 * le serveur et le navigateur. Ce composant ne s'exécute QUE sur le serveur :
 * son HTML n'est jamais recalculé côté client, il n'y a donc rien à faire
 * concorder. L'instant exact reste porté par `<time dateTime>`, en ISO et en
 * UTC - lisible par une machine quel que soit l'affichage.
 */
export async function BuildStamp() {
  const t = await getDictionary();
  const { release, dateTime } = describeBuild(buildInfo);

  // Ni version ni empreinte : on se tait plutôt que d'afficher un séparateur
  // suivi de rien.
  if (!release && !dateTime) return null;

  return (
    <>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        <span className="sr-only">{t.common.buildLabel} </span>
        {release}
      </span>
      {dateTime && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={dateTime} className="tabular-nums">
            {formatDateTime(dateTime)}
          </time>
        </>
      )}
    </>
  );
}
