import type { Metadata } from "next";
import { TrackerMark } from "@/components/brand/tracker-mark";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Artemis" };

/**
 * PAGE HORS LIGNE - ce qu'on voit quand le réseau manque.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELLE SE SUFFIT À ELLE-MÊME
 *
 * Tout est en styles EN LIGNE, sans une seule classe utilitaire. C'est la seule
 * page du produit dont on sait qu'elle s'affichera pendant une panne de réseau :
 * si elle allait chercher sa feuille de style, elle arriverait nue, au moment
 * précis où l'on a besoin qu'elle soit lisible.
 *
 * Le corollaire est heureux : le service worker n'a qu'UN document à garder en
 * réserve, et pas une collection d'aplats et de polices dont chaque mise à jour
 * périmerait une partie.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ELLE NE MONTRE AUCUNE DONNÉE
 *
 * Ni ticket, ni projet, ni nom. C'est une exigence, pas une économie : ce
 * document est mis en cache sur la machine, et une machine se partage. Rien de
 * ce qui appartient à quelqu'un ne doit y figurer.
 */
export default async function OfflinePage() {
  const t = await getDictionary();
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem",
        textAlign: "center",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#1c1c22",
        background: "#fdfdfd",
      }}
    >
      {/* L'emblème est un SVG DANS le document, pas un fichier à télécharger :
          une `<img src="/icons/…">` arrivait cassée hors ligne - constaté à
          l'écran, l'icône n'étant pas en réserve. Rien ici ne dépend du
          réseau. */}
      <TrackerMark
        aria-hidden
        style={{ width: "3.5rem", height: "3.5rem", color: "#5f4ec2" }}
      />
      <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
        {t.offline.title}
      </h1>
      <p style={{ margin: 0, maxWidth: "32rem", fontSize: "0.875rem", color: "#5b5b66" }}>
        {t.offline.description}
      </p>
    </main>
  );
}
