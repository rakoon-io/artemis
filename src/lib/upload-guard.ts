/**
 * GARDES COMMUNES AUX DEUX ROUTES DE DÉPÔT.
 *
 * Un module partagé, et non deux copies : la faille la plus grave de cet audit
 * venait précisément de là - cinq voies d'écriture, quatre qui vérifiaient le
 * type déclaré, une qui l'avait oublié. Ce qui est écrit une fois ne peut pas
 * diverger.
 */

/** Taille maximale annoncée dépassée, avant même d'avoir lu le corps ? */
export function declaredTooLarge(request: Request, maxBytes: number): boolean {
  const annonce = Number(request.headers.get("content-length"));
  return Number.isFinite(annonce) && annonce > maxBytes;
}

/**
 * La clé est-elle bien de la forme que le serveur ÉMET ?
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS UN DÉTAIL
 *
 * La clé arrivait du client, et l'on n'en vérifiait que le préfixe. Trois
 * conséquences, toutes atteignables par un utilisateur légitime :
 *
 * - RÉÉCRITURE : rien n'obligeait la clé à être une de celles que le serveur
 *   avait émises. Redéposer sur une clé existante remplaçait les octets d'un
 *   autre, tandis que la ligne continuait d'afficher son nom, sa taille et son
 *   type ;
 * - ENLISEMENT : `attachments/<ticket>` sans troisième segment passait le
 *   contrôle de préfixe et écrivait un FICHIER nommé comme le dossier attendu ;
 *   tout dépôt ultérieur sur ce ticket échouait alors à la création du dossier ;
 * - et l'on ne pouvait pas rattacher la clé à l'identifiant qu'elle prétend
 *   porter.
 *
 * On exige donc exactement trois segments, le deuxième étant le propriétaire
 * attendu, le troisième portant le préfixe aléatoire que `safeSuffix` engendre.
 */
export function keyLooksIssued(
  key: string,
  prefix: "attachments" | "wiki",
  ownerId: string,
): boolean {
  const segments = key.split("/");
  if (segments.length !== 3) return false;
  const [espace, proprietaire, nom] = segments;
  if (espace !== prefix) return false;
  if (!proprietaire || proprietaire !== ownerId) return false;
  // `safeSuffix` : douze caractères d'UUID, un tiret, puis le nom assaini.
  return /^[0-9a-f-]{12}-[\w.\-]+$/.test(nom ?? "");
}
