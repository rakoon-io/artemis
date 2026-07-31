import type { MetadataRoute } from "next";

/**
 * MANIFESTE D'APPLICATION - ce qui rend Artemis installable.
 *
 * Servi sur `/manifest.webmanifest`, et lié automatiquement dans le `<head>` par
 * Next. C'est lui qui autorise le navigateur à proposer « Installer » : sans
 * manifeste, Artemis reste un onglet parmi d'autres.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'INSTALLATION CHANGE VRAIMENT
 *
 * `display: standalone` retire la barre d'adresse et les onglets. Pour un
 * tableau Kanban qu'on garde ouvert toute la journée, ce sont une soixantaine de
 * pixels de hauteur rendus au contenu - le même combat que la barre unique du
 * haut. L'application gagne aussi sa propre fenêtre, sa propre icône dans le
 * dock, et ne se perd plus dans une rangée de trente onglets.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX COULEURS QUI NE SE VALENT PAS
 *
 * `background_color` peint l'écran de démarrage AVANT que la moindre feuille de
 * style soit lue : il doit valoir le fond de l'application, sans quoi le
 * lancement commence par un éclair blanc ou noir. `theme_color` teinte le
 * décor du système autour de la fenêtre, et prend donc la couleur de la marque.
 *
 * Les deux sont figées, là où l'application se décline en plusieurs thèmes : un
 * manifeste ne peut pas suivre un choix rangé côté client. On donne la valeur du
 * thème par défaut, celle que voit quelqu'un qui installe sans avoir rien réglé.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Identité STABLE de l'application installée. Sans elle, le navigateur
    // déduit l'identité de `start_url` : changer un jour la page d'accueil
    // créerait une seconde application au lieu de mettre à jour la première.
    id: "/",
    name: "Artemis",
    short_name: "Artemis",
    description:
      "Suivi de tickets sobre, moderne et personnalisable pour une méthode agile.",
    // La racine redirige vers les projets, ou vers la connexion : c'est le seul
    // point d'entrée qui reste juste quel que soit l'état de la session.
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fdfdfd",
    theme_color: "#5f4ec2",
    // Langue de référence du produit ; l'interface, elle, suit le choix de
    // chacun - un manifeste ne se traduit pas par utilisateur.
    lang: "fr",
    dir: "ltr",
    orientation: "any",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // MASQUABLE : Android rogne l'icône à la forme de son lanceur. Celle-ci
      // est dessinée bord à bord, motif réduit, pour supporter la découpe.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
