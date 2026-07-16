# Vision - Artemis

> **À lire en premier.** Ce document est la « North Star » du projet : toute décision produit
> ou de code doit pouvoir s'y rattacher. En cas de doute ou de conflit, **cette vision prime**.
> Mettez-le à jour quand la direction produit change (et ouvrez un ADR dans `decisions/` pour
> les décisions structurantes).

---

## Objectif

**Artemis** est un **outil de suivi de tickets** (bugs, tâches, demandes) pensé pour être
**sobre, moderne, efficace et personnalisable**. Il permet à une équipe d'organiser son travail
selon une **méthode agile** (backlog, sprints/lots, tableau Kanban) sans la lourdeur des suites
généralistes du marché.

**Problème résolu.** Les outils existants sont soit trop complexes et coûteux, soit trop rigides.
Artemis vise le juste milieu : **création de ticket sans friction**, **flux de travail
personnalisable**, et une interface épurée qui va à l'essentiel.

## Proposition de valeur

- **Créer un ticket en quelques secondes** - le strict minimum requis, avec une **pièce jointe
  collée** (image du presse-papier, fichier de log, texte).
- **Flux de travail personnalisable** - colonnes/statuts adaptables à chaque équipe et méthode agile.
- **Deux vues complémentaires** - Kanban (drag & drop) et liste filtrable.
- **Planification agile** - regroupement des tickets en **lots / sprints**.
- **Design sobre & moderne** - interface claire, accessible, thémable.

## Public cible & rôles

Outil **interne** pour les équipes du client **Rakoon** (organisation unique en v1).

| Rôle | Portée |
|------|--------|
| **Admin** | Vue **étendue** : gestion complète des projets, du workflow (colonnes), des sprints/lots, des utilisateurs, des labels, de la personnalisation et des paramètres. Accès total aux tickets. |
| **Rapporteur** | Vue **limitée** : création de tickets (avec pièces jointes), consultation et commentaire des tickets de ses projets, édition de ses propres tickets. Pas d'accès à la configuration ni à l'administration. |

> Le modèle de permissions est un **RBAC extensible** (voir `decisions/0003-rbac-admin-rapporteur.md`) :
> d'autres rôles pourront être ajoutés sans refonte.

## Principes produit (non négociables)

1. **Sobre** - pas de superflu ; densité d'information maîtrisée.
2. **Moderne** - standards UI/UX actuels, accessibilité (a11y) de base assurée.
3. **Efficace** - les actions fréquentes (créer, déplacer, filtrer) sont rapides et à faible friction.
4. **Personnalisable** - le workflow, les labels et le thème s'adaptent à l'équipe.

## Fonctionnalités cœur (v1)

- Création rapide de ticket, **pièce jointe par copier-coller** (image / log / texte).
- **Vue Kanban** avec drag & drop et **colonnes configurables**.
- **Vue liste** avec filtres, tri et recherche.
- **Sprints / lots** : backlog, planification, itérations.
- **Commentaires** et **pièces jointes** sur les tickets.
- **Personnalisation** : colonnes du workflow, labels, thème clair/sombre.
- **Rôles** Admin / Rapporteur.

## Non-objectifs (v1)

Explicitement **hors périmètre** de la première version, pour rester focalisé :

- Temps réel / collaboration live (websockets) - **rafraîchissement à la demande**.
- Notifications par e-mail.
- Application mobile native (le **web responsive** suffit).
- Intégrations externes (Jira, GitHub, Slack…).
- Reporting / analytics avancé (burndown, vélocité…).
- Multi-organisation / multi-tenant.
- Internationalisation multi-langue (**FR par défaut**).

Ces points pourront être reconsidérés après la v1 (voir le backlog dans `../SPEC.md`).

## Stack (résumé)

Monolithe full-stack **TypeScript / Next.js**. Détail et justification :
[`architecture.md`](./architecture.md) et [`decisions/0001-stack-nextjs-typescript.md`](./decisions/0001-stack-nextjs-typescript.md).

- **Front** : Next.js (App Router) · React · Tailwind CSS · shadcn/ui · dnd-kit
- **Back** : Route Handlers / Server Actions · Zod · Prisma
- **Données** : PostgreSQL · stockage **S3-compatible** (pièces jointes)
- **Auth** : Auth.js (RBAC)
- **Qualité** : TypeScript · ESLint · Prettier · Vitest · Playwright
- **Déploiement** : Dokploy (Docker) sur `apps.rakoon.io` (self-host)

## Contraintes

- **Accessibilité** : composants accessibles (Radix/shadcn), navigation clavier, contrastes.
- **Données personnelles** : minimisation, conformité **RGPD** (utilisateurs internes).
- **Self-hostable** : doit pouvoir tourner en auto-hébergement (Docker + Postgres).
- **Langue** : **français** par défaut.

## Définition du succès (v1 « Done »)

Un utilisateur **Admin** peut créer un projet, configurer ses colonnes, inviter un **Rapporteur** ;
ce dernier peut créer un ticket avec **une image collée en moins de 30 secondes**. Les tickets se
déplacent en Kanban (drag & drop), se regroupent en **sprint**, et se retrouvent via la **vue liste
filtrable**.
