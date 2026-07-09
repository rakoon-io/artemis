# 📏 Règles de génération de code — Rakoon Tracker

> **Ces règles s'imposent à toute génération ou édition de code.** Elles déclinent la
> [`vision.md`](./vision.md) et l'[`architecture.md`](./architecture.md) en consignes concrètes et
> actionnables. En cas de doute, la **vision prime** ; toute exception structurante ⇒ **ADR** dans
> [`decisions/`](./decisions/).

---

## ✅ DO

1. **TypeScript strict** — activer `strict` ; typer explicitement les frontières (retours de services, props publiques, valeurs d'API).
2. **Valider toute entrée avec Zod à la frontière** — formulaires, Route Handlers, Server Actions ; schémas partagés dans `lib/validators`.
3. **Autoriser via des policies RBAC côté serveur** — `peut(user, action, ressource)` dans `server/policies` ; l'**UI masque, le serveur impose**.
4. **Placer la logique métier dans `server/services`** — un service = une intention métier réutilisable et testable.
5. **Accéder à la DB uniquement via les services / Prisma** — un seul chemin d'accès aux données, entièrement typé.
6. **Paginer toute liste** — jamais de `findMany` non borné ; curseur (ou offset) + limite par défaut.
7. **Livrer des composants accessibles** — navigation **clavier**, rôles/attributs **ARIA** (Radix/shadcn), contrastes AA ; Kanban jouable au clavier (dnd-kit).
8. **Respecter le nommage** — fichiers en **kebab-case**, composants React en **PascalCase**, enums en `SCREAMING_SNAKE_CASE`.
9. **Valider les variables d'environnement via Zod** dans `lib/env.ts` — échec explicite au démarrage si une variable manque.
10. **Écrire des tests Vitest sur la logique métier** — services, policies et validators couverts.
11. **Suivre les Conventional Commits** — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`…
12. **Ouvrir un ADR pour toute décision structurante** — dans [`decisions/`](./decisions/), **avant** d'implémenter.
13. **Mettre à jour [`context.md`](./context.md) après un changement notable** — état courant, changements récents, prochaines étapes.
14. **Rédiger les textes d'UI en français** — libellés, messages et erreurs (FR par défaut, pas d'i18n en v1).

## ⛔ DON'T

1. **Pas de `any`** (ni cast abusif via `as`) — préférer un type précis, ou `unknown` suivi d'une validation.
2. **Pas de secret en dur** — clés, mots de passe et URLs sensibles passent par l'environnement validé (`lib/env.ts`).
3. **Pas de logique métier dans les composants UI** — les composants affichent, les services décident.
4. **Pas de requête Prisma dans un composant** — toujours passer par un service (via Server Action / Route Handler).
5. **Pas de liste non paginée** — aucune requête ne renvoie un volume non borné.
6. **Pas d'autorisation uniquement côté client** — masquer dans l'UI ne dispense **jamais** de la policy serveur.
7. **Pas d'entrée non validée** — aucune donnée externe n'atteint un service sans schéma Zod.
8. **Pas de statut de workflow codé en dur** — les statuts sont des `Column` en base (par projet).
9. **Ne pas introduire une fonctionnalité des non-objectifs v1 sans ADR** — temps réel/websockets, e-mails, mobile natif, intégrations externes, analytics avancé, multi-tenant, i18n.
10. **Pas de commit si `typecheck` / `lint` / `test` échouent** — la Vérification passe **avant** le Commit.
11. **Pas de dépendance lourde sans justification** — évaluer taille et maintenance ; tracer le choix (ADR si structurant).
12. **Ne pas contourner les policies** — aucun accès « de confiance » direct à la DB ou au stockage en dehors des services.

## 🔒 Rappels transverses

- **Sécurité** — pièces jointes servies via **URLs presignées à durée limitée** ; le serveur vérifie les droits **avant** d'émettre l'URL.
- **RGPD** — **minimisation** des données personnelles (utilisateurs internes) : ne collecter et n'exposer que le nécessaire.
- **Performance** — interactions courantes **< 200 ms perçu** ; listes paginées, requêtes indexées, rendu optimisé.

## 🔗 Références

- [`vision.md`](./vision.md) — North Star produit.
- [`architecture.md`](./architecture.md) — patterns, conventions, modèle de données.
- [`../AGENTS.md`](../AGENTS.md) — garde-fou « à lire avant toute modif ».
- [`decisions/`](./decisions/) — ADR (décisions structurantes).
