# SPEC-0004 - Rôles & permissions
- **Statut** : Rédigée (v1)
- **Rôles concernés** : Admin · Rapporteur

## Objectif

Définir l'**authentification** et le modèle d'**autorisation** (RBAC) à deux rôles : `ADMIN`
(étendu) et `REPORTER` (limité). Principe directeur : **l'UI masque, le serveur impose** - toute
action sensible passe par une **policy** serveur, jamais côté client seul.

## User stories

- En tant qu'utilisateur, je veux me connecter par **e-mail/mot de passe** afin d'accéder à mes projets.
- En tant qu'**Admin**, je veux gérer les **rôles** afin de contrôler qui configure le projet.
- En tant que **Rapporteur**, je veux voir **masquées** les actions qui me sont interdites afin de
  garder une interface claire.
- En tant que responsable sécurité, je veux que chaque action soit **vérifiée côté serveur** afin
  qu'un contournement de l'UI reste sans effet.

## Matrice de permissions

| Action | Admin | Rapporteur |
|--------|:-----:|:----------:|
| Créer un ticket | | |
| Voir les tickets de ses projets | | |
| Commenter un ticket | | |
| Éditer **ses** tickets | | |
| Éditer **tout** ticket / réassigner / changer le statut d'autrui | | |
| Déplacer une carte en Kanban | | ses tickets uniquement |
| Gérer les colonnes / workflow | | |
| Créer / gérer les sprints & lots | | |
| Gérer les labels | | |
| Gérer les utilisateurs & rôles | | |
| Supprimer un ticket / projet | | |
| Paramètres & personnalisation du projet | | |

## Critères d'acceptation

- [ ] Étant donné des identifiants valides, Quand je me connecte, Alors une **session** Auth.js est
      créée et mon `role` est disponible côté serveur.
- [ ] Étant donné un **Rapporteur**, Quand il appelle une route d'administration (colonnes, sprints,
      labels, utilisateurs), Alors le serveur répond **403**, même si l'UI est contournée.
- [ ] Étant donné un **Rapporteur**, Quand il édite un ticket dont il n'est pas l'auteur, Alors
      l'action est refusée (**403**).
- [ ] Étant donné la matrice ci-dessus, Quand une policy évalue `peut(user, action, ressource)`,
      Alors le résultat correspond **exactement** à la ligne concernée.
- [ ] Étant donné une **session expirée**, Quand j'effectue une action, Alors je suis redirigé vers
      la connexion et l'action n'est pas exécutée.

## Règles & comportements

- **Rôles** : enum `Role { ADMIN REPORTER }` ; défaut `REPORTER` à la création d'un utilisateur.
- **Policies centralisées** (`server/policies`) : source unique de vérité `peut(user, action, ressource)`.
- **UI cohérente** : actions interdites **masquées ou désactivées** ; la sécurité repose sur le serveur.
- **Authentification** : e-mail/mot de passe en v1 ; `passwordHash` nul si OAuth. **OAuth/SSO** est
  une **évolution** prévue (RBAC extensible).
- **Mots de passe** : hachés (jamais en clair) ; validation Zod à la frontière.

## Cas limites

- **Rapporteur tentant une action admin** : refus **403**, journalisé ; aucun effet de bord.
- **Dernier admin** : impossible de rétrograder ou supprimer le **dernier `ADMIN`** (le projet doit
  toujours conserver au moins un administrateur).
- **Session expirée / invalide** : redirection connexion ; les mutations en vol sont annulées.
- **Changement de rôle en session** : appliqué dès la prochaine évaluation de policy.

## Hors périmètre (v1)

- Rôles additionnels au-delà d'Admin/Rapporteur (RBAC prévu extensible).
- Permissions **fines** par projet ou par colonne.
- SSO d'entreprise, MFA, politiques de mot de passe avancées.

## Références

- Spec produit (matrice source) : [`../../SPEC.md`](../../SPEC.md) (§ 2.1)
- Architecture (RBAC, policies) : [`../architecture.md`](../architecture.md#patterns-clés)
- ADR RBAC Admin/Rapporteur : [`../decisions/0003-rbac-admin-rapporteur.md`](../decisions/0003-rbac-admin-rapporteur.md)
- Vision (rôles) : [`../vision.md`](../vision.md)
- Vue Kanban (déplacement restreint) : [`./0002-vue-kanban.md`](./0002-vue-kanban.md)
