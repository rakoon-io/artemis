"use client";

import { useEffect } from "react";

/**
 * Déclare le service worker au navigateur.
 *
 * Un effet, et non un appel au rendu : `navigator` n'existe pas sur le serveur,
 * et l'enregistrement n'a aucun sens avant que la page soit affichée.
 *
 * L'échec est SILENCIEUX, à dessein. L'enregistrement échoue en clair (hors
 * `localhost`), dans un onglet privé, ou si l'utilisateur a désactivé la
 * fonctionnalité - trois situations où l'application marche parfaitement sans.
 * Y répondre par une erreur visible ferait passer pour une panne ce qui n'est
 * qu'une commodité en moins.
 *
 * Enregistré aussi en développement : ce service worker ne met en cache que la
 * page « hors ligne » et laisse tout le reste passer au réseau (voir
 * `public/sw.js`). Il ne peut donc pas servir de vieux fichiers pendant qu'on
 * travaille - le piège habituel de ce genre de fichier.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
