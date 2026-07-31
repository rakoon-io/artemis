/**
 * SERVICE WORKER D'ARTEMIS - le strict nécessaire, et rien de plus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IL NE MET EN CACHE AUCUNE DONNÉE
 *
 * C'est la décision qui gouverne tout le fichier. Artemis est une application
 * authentifiée : chaque page contient les tickets, les noms et les commentaires
 * de QUELQU'UN. Un cache de pages survit à la déconnexion et se partage avec les
 * autres comptes de la machine - le suivant lirait, hors ligne, ce que le
 * précédent avait ouvert.
 *
 * Une seule ressource est donc gardée : la page « hors ligne », qui ne montre
 * rien de personnel. Les appels d'API et les pages ne sont jamais stockés, et
 * les requêtes qui ne sont pas des navigations ne sont même pas interceptées.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'IL APPORTE MALGRÉ TOUT
 *
 * Un navigateur n'installe une application que si elle répond encore quand le
 * réseau ne répond plus. Ce fichier est cette réponse - et il donne au passage
 * un écran honnête (« pas de connexion ») là où le navigateur affichait son
 * dinosaure ou une page blanche.
 *
 * On n'accélère RIEN : mettre `_next/static` en réserve serait tentant et
 * probablement sans danger - ces fichiers portent une empreinte dans leur nom et
 * n'appartiennent à personne -, mais ce serait un cache de plus à faire vieillir
 * correctement, pour un gain que le réseau local rend imperceptible.
 */

const CACHE = "artemis-hors-ligne-v1";
const PAGE_HORS_LIGNE = "/hors-ligne";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(PAGE_HORS_LIGNE, { cache: "reload" })))
      // Sans `skipWaiting`, une version corrigée attendrait la fermeture de tous
      // les onglets ouverts - c'est-à-dire, pour une application qu'on garde
      // ouverte toute la journée, indéfiniment.
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const requete = event.request;

  // On ne se mêle QUE des navigations : ni les API, ni les images, ni les
  // scripts ne passent par ici. Moins de surface, moins de façons de se tromper.
  if (requete.method !== "GET" || requete.mode !== "navigate") return;
  if (new URL(requete.url).origin !== self.location.origin) return;

  event.respondWith(
    // Le réseau D'ABORD, toujours : la réponse fraîche est la seule qui dise la
    // vérité sur l'état des tickets. Le cache n'intervient qu'en cas d'échec.
    fetch(requete).catch(async () => {
      const repli = await caches.match(PAGE_HORS_LIGNE);
      return (
        repli ??
        new Response("Hors ligne.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }),
  );
});
