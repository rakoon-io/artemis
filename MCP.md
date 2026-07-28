# Serveur MCP - Artemis

Artemis expose un serveur [MCP](https://modelcontextprotocol.io) (Model Context
Protocol) qui permet a un assistant IA de **prendre en charge des tickets** :
lister, lire, s'assigner un ticket, le faire avancer et commenter.

L'assistant agit au nom d'un **compte de service** et respecte exactement les
memes regles d'acces que l'application web (appartenance au projet, autorisation
cote serveur). Il ne peut donc rien faire qu'un membre du projet ne pourrait faire.

## Compte de service

L'assistant agit au nom de l'utilisateur designe par `ARTEMIS_MCP_ACTOR_EMAIL`
(defaut `bot@rakoon.io`). Ce compte :

- doit exister en base (le seed cree `bot@rakoon.io`, sans mot de passe : il n'a
  pas d'acces web) ;
- doit etre **membre** des projets sur lesquels l'IA doit intervenir. On l'ajoute
  depuis **Parametres du projet -> Membres**, comme n'importe quel utilisateur.

Ainsi, un administrateur controle precisement les projets accessibles a l'IA.

## Lancer le serveur

Le serveur communique en **stdio** (entree/sortie standard), le mode attendu par
les clients MCP. Il a besoin de `DATABASE_URL` (acces base) et, optionnellement,
de `ARTEMIS_MCP_ACTOR_EMAIL`.

```bash
npm run mcp
```

## Configurer un client MCP

Un exemple prêt à l'emploi est fourni à la racine du dépôt dans
[`.mcp.json`](./.mcp.json) (format reconnu par Claude Code et compatibles). Il
utilise l'expansion `${VAR}` pour **ne coder aucun secret** : les valeurs sont
lues depuis l'environnement.

```json
{
  "mcpServers": {
    "artemis": {
      "command": "npm",
      "args": ["run", "--silent", "mcp"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "ARTEMIS_MCP_ACTOR_EMAIL": "${ARTEMIS_MCP_ACTOR_EMAIL:-bot@rakoon.io}"
      }
    }
  }
}
```

Pour les clients qui ne gèrent pas l'expansion de variables (ex.
`claude_desktop_config.json`), renseignez les valeurs directement et ajoutez
`"cwd": "/chemin/absolu/vers/artemis"` — **sans committer** de secret.

## Outils exposes

| Outil | Effet |
|-------|-------|
| `list_projects` | Projets accessibles a l'assistant. |
| `list_statuses` | Statuts (colonnes) d'un projet. |
| `list_modules` | Modules fonctionnels d'un projet (nom, description, composants regroupes). |
| `list_components` | Composants applicatifs d'un projet (nom, nature, description). |
| `list_tickets` | Tickets d'un projet (filtres `status`, `assignee`, `component`, `module`, `limit`). |
| `get_ticket` | Detail d'un ticket (description, module, composant, commentaires, etc.). |
| `create_ticket` | Cree un ticket (type / priorite / composant / module / assigne optionnels). |
| `take_ticket` | Prend un ticket en charge : se l'assigne et le passe en cours. |
| `comment_ticket` | Ajoute un commentaire. |
| `move_ticket` | Change le statut d'un ticket pris en charge. |
| `update_ticket` | Met a jour le titre / la description d'un ticket pris en charge. |

### Modules

Au-dessus des composants, chaque projet declare ses **modules fonctionnels**
(Parametres du projet -> Modules) : un pan du produit a grosse maille (« Gestion
des utilisateurs ») avec un nom et une description facultative. Un module
regroupe plusieurs composants. Tout est facultatif : un projet peut n'en declarer
aucun.

- `list_modules` renvoie les modules d'un projet avec, pour chacun, les noms des
  composants qu'il regroupe : c'est la vue d'ensemble a lire en premier pour
  situer une demande.
- `create_ticket` accepte `module` (nom du module, insensible a la casse ; sans
  valeur, aucun module). Un nom inconnu provoque une erreur qui liste les modules
  disponibles.
- **Precedence** : un ticket ne porte jamais un module ET un composant. Des qu'un
  `component` est fourni, le module retenu est celui de ce composant et
  l'argument `module` est simplement ignore (aucune erreur). Le `module` sert
  donc aux demandes trop larges pour designer un composant precis.
- `list_tickets` accepte `module` : le filtre ramene les tickets rattaches au
  module **directement** comme ceux qui le sont **via leur composant**.
- `get_ticket`, `list_tickets` et `create_ticket` renvoient le champ `module`
  (nom du module effectif - celui du composant s'il y en a un, sinon celui du
  ticket - ou `null`).

### Composants

Chaque projet declare ses **composants applicatifs** (Parametres du projet ->
Composants) : une brique de l'application avec un nom, une **nature** (`PAGE`,
`SHARED` ou `SERVICE`) et une description facultative. Rattacher un ticket a un
composant situe la demande dans l'application et donne du contexte a l'assistant.

- `list_components` renvoie les composants d'un projet ; c'est le point de depart
  pour connaitre les noms acceptes.
- `create_ticket` accepte `component` (nom du composant, insensible a la casse ;
  sans valeur, le ticket n'est rattache a aucun composant). Un nom inconnu
  provoque une erreur qui liste les composants disponibles.
- `list_tickets` accepte `component` pour ne garder que les tickets d'un
  composant donne.
- `get_ticket`, `list_tickets` et `create_ticket` renvoient le champ `component`
  (nom du composant, ou `null`).

## Regles d'autorisation

- Toute operation exige que l'acteur ait **acces au projet** (membre ou admin).
- `take_ticket` n'accepte qu'un ticket **libre** (ou deja assigne a l'acteur) :
  l'IA ne prend pas le travail de quelqu'un d'autre.
- `move_ticket` et `update_ticket` ne s'appliquent qu'aux tickets **assignes a
  l'acteur** : l'IA ne modifie que ce qu'elle a pris en charge.
- `create_ticket` cree le ticket dans un projet **accessible** a l'acteur (qui en
  devient le rapporteur), a l'image de tout membre du projet.
- `comment_ticket` et la lecture sont possibles sur tout ticket accessible.

Un flux typique : `list_tickets` (assignee `unassigned`) -> `take_ticket` ->
`comment_ticket` (avancement) -> `move_ticket` vers « Terminé ».

Pour signaler un besoin : `list_modules` (vue d'ensemble) -> `list_components`
-> `create_ticket` avec le `component` concerne, ou a defaut le `module` seul si
la demande est trop large pour viser un composant.
