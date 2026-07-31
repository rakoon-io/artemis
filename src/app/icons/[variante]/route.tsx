import { ImageResponse } from "next/og";
import { getInstance } from "@/server/services/settings.service";
import { MARK_DATA_URI } from "@/lib/mark-svg";

/**
 * ICÔNES D'APPLICATION, peintes aux couleurs de l'instance.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI ENGENDRÉES, ET NON DES FICHIERS
 *
 * Trois déploiements du même produit posaient trois icônes identiques dans le
 * dock. Or l'apparence se règle par déploiement, et depuis l'administration : un
 * fichier livré dans le dépôt ne peut en tenir compte. On dessine à la demande.
 *
 * Le coût est nul en pratique : un navigateur ne lit ces images qu'à
 * l'installation, et l'en-tête de cache les fige pour un an.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * « IMMUABLE » RESTE VRAI, GRÂCE AU JETON
 *
 * L'apparence étant modifiable, un cache d'un an mentirait... si l'adresse ne
 * changeait pas avec elle. Le manifeste demande `?v=<jeton>`, empreinte des
 * réglages : chaque apparence a son adresse, et le contenu d'une adresse donnée
 * ne change effectivement jamais. Sans ce jeton, régler la couleur n'aurait
 * servi qu'aux installations à venir.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS VARIANTES, ET POURQUOI
 *
 *   192  - la taille que réclament les navigateurs pour l'écran d'accueil ;
 *   512  - celle des écrans de démarrage et des grandes vignettes ;
 *   maskable - Android rogne l'icône à la forme de son lanceur et ne garantit
 *              qu'un cercle de 80 % : le motif y est réduit, le fond débordant.
 */

interface Variante {
  taille: number;
  /** Part du côté occupée par le motif : réduite si l'icône sera rognée. */
  motif: number;
  /** Coins arrondis, sauf pour la masquable, que le système découpe lui-même. */
  rayon: number;
  /**
   * L'icône sera-t-elle ROGNÉE par le système ?
   *
   * Change la façon de poser l'étiquette, et non sa taille seulement : une
   * bande pleine largeur collée au bas de l'image - ce qui fait une belle icône
   * d'application - disparaît entièrement sous un masque circulaire. Constaté
   * en regardant l'image produite. Sur une icône masquable, l'étiquette devient
   * donc une pastille ramenée près du centre, dans le cercle de 80 % que le
   * système garantit.
   */
  rognee: boolean;
}

const VARIANTES: Record<string, Variante> = {
  "192": { taille: 192, motif: 0.62, rayon: 0.24, rognee: false },
  "512": { taille: 512, motif: 0.62, rayon: 0.24, rognee: false },
  maskable: { taille: 512, motif: 0.42, rayon: 0, rognee: true },
};

/** Assombrit une couleur pour en tirer un dégradé, sans dépendance. */
function assombrir(hex: string, part: number): string {
  const plein =
    hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
  const canaux = [1, 3, 5].map((i) =>
    Math.round(parseInt(plein.slice(i, i + 2), 16) * (1 - part)),
  );
  return `#${canaux.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export function GET(
  _request: Request,
  { params }: { params: Promise<{ variante: string }> },
) {
  return params.then(async ({ variante }) => {
    const instance = await getInstance();
    const forme = VARIANTES[variante];
    if (!forme) return new Response("Icône inconnue.", { status: 404 });

    const { taille, motif, rayon, rognee } = forme;
    const cote = Math.round(taille * motif);
    const bande = Math.round(taille * (rognee ? 0.19 : 0.26));

    // Un voile sombre plutôt qu'une couleur choisie : il fonce le fond quel
    // qu'il soit, et garde donc le texte lisible sur une teinte claire comme
    // sur une teinte sombre.
    const etiquette = instance.label && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: bande,
          backgroundColor: "rgba(0,0,0,0.42)",
          color: "#ffffff",
          fontSize: Math.round(taille * (rognee ? 0.12 : 0.15)),
          fontWeight: 700,
          letterSpacing: Math.round(taille * 0.006),
          ...(rognee
            ? // Pastille ramenée vers le centre, dans le cercle garanti.
              {
                marginTop: Math.round(taille * 0.03),
                paddingLeft: Math.round(taille * 0.05),
                paddingRight: Math.round(taille * 0.05),
                borderRadius: bande,
              }
            : // Bande pleine largeur, posée au bas de l'icône.
              { position: "absolute", bottom: 0, width: "100%" }),
        }}
      >
        {instance.label.toUpperCase()}
      </div>
    );

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: rayon ? `${Math.round(taille * rayon)}px` : 0,
            backgroundImage: `linear-gradient(135deg, ${assombrir(instance.color, 0.22)}, ${instance.color})`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MARK_DATA_URI}
            alt=""
            width={cote}
            height={cote}
            // Icône entière : le motif remonte de la moitié de la bande, sinon
            // l'étiquette lui volerait son centre optique. Icône rognée : les
            // deux sont empilés et centrés ensemble, donc rien à corriger.
            style={rognee ? {} : { marginTop: -bande / 2 }}
          />
          {etiquette}
        </div>
      ),
      {
        width: taille,
        height: taille,
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  });
}
