/** Résultat uniforme d'une Server Action — jamais d'exception vers le client. */
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
