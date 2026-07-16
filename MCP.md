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

Exemple de configuration (format `claude_desktop_config.json` et compatibles) :

```json
{
  "mcpServers": {
    "artemis": {
      "command": "npm",
      "args": ["run", "--silent", "mcp"],
      "cwd": "/chemin/absolu/vers/artemis",
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/artemis",
        "ARTEMIS_MCP_ACTOR_EMAIL": "bot@rakoon.io"
      }
    }
  }
}
```

## Outils exposes

| Outil | Effet |
|-------|-------|
| `list_projects` | Projets accessibles a l'assistant. |
| `list_statuses` | Statuts (colonnes) d'un projet. |
| `list_tickets` | Tickets d'un projet (filtres `status`, `assignee`, `limit`). |
| `get_ticket` | Detail d'un ticket (description, commentaires, etc.). |
| `take_ticket` | Prend un ticket en charge : se l'assigne et le passe en cours. |
| `comment_ticket` | Ajoute un commentaire. |
| `move_ticket` | Change le statut d'un ticket pris en charge. |
| `update_ticket` | Met a jour le titre / la description d'un ticket pris en charge. |

## Regles d'autorisation

- Toute operation exige que l'acteur ait **acces au projet** (membre ou admin).
- `take_ticket` n'accepte qu'un ticket **libre** (ou deja assigne a l'acteur) :
  l'IA ne prend pas le travail de quelqu'un d'autre.
- `move_ticket` et `update_ticket` ne s'appliquent qu'aux tickets **assignes a
  l'acteur** : l'IA ne modifie que ce qu'elle a pris en charge.
- `comment_ticket` et la lecture sont possibles sur tout ticket accessible.

Un flux typique : `list_tickets` (assignee `unassigned`) -> `take_ticket` ->
`comment_ticket` (avancement) -> `move_ticket` vers « Terminé ».
