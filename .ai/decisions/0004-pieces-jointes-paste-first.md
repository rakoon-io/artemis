# ADR-0004 - Pièces jointes « paste-first » (presse-papier → URL presignée → S3)
- **Statut** : Acceptée
- **Date** : 2026-07-09
- **Décideurs** : équipe Rakoon Tracker

## Contexte
La fonction phare du produit est la **création de ticket sans friction** : le **Rapporteur** doit
pouvoir coller une **image** du presse-papier, un **fichier de log** ou du **texte** directement dans
le formulaire, et créer son ticket avec pièce jointe en **moins de 30 secondes**. Il faut donc un
chemin d'upload **rapide**, **sécurisé** (droits vérifiés) et **scalable**, compatible avec un
stockage self-hostable.

## Décision
Le parcours d'une **Pièce jointe** est le suivant :
1. **Capture côté client** - la zone de collage récupère le contenu du presse-papier (image / texte / log).
2. **Demande d'URL presignée** - le client appelle le serveur, qui **vérifie les droits** (policy
   RBAC, voir ADR-0003) puis génère une **URL presignée à durée limitée** pour une clé objet dédiée.
3. **Téléversement direct** - le binaire part du navigateur vers le **stockage S3-compatible**, sans
   transiter par le serveur applicatif.
4. **Enregistrement** - le serveur crée un **`Attachment`** (`filename`, `contentType`, `size`,
   `storageKey`, `uploadedById`) lié au **Ticket**.

En local, le stockage est **MinIO** ; en production, tout service **S3-compatible** convient.

## Alternatives considérées
- **Stocker le binaire en base (base64 / bytea)** - simple à mettre en place, mais gonfle PostgreSQL,
  dégrade sauvegardes et performances, et plafonne vite en taille.
- **Upload multipart passant par le serveur applicatif** - le fichier transite par Next.js : charge
  CPU/mémoire et limites de payload accrues, sans bénéfice face à l'upload direct presigné.

## Conséquences
### Positives
- **Friction minimale** : coller puis créer, l'upload est direct et rapide.
- **Scalable** : le serveur applicatif ne porte pas le trafic binaire ; le stockage objet encaisse le volume.
- **Sécurisé** : URL presignée à durée limitée, droits vérifiés avant émission.

### Négatives / compromis
- **Dépendance** à un stockage objet (S3 / MinIO) à provisionner et configurer (CORS, cycle de vie).
- **Objets orphelins** : un upload sans `Attachment` enregistré doit être nettoyé (job / politique de rétention).
- **Cohérence à deux temps** entre l'objet stocké et la ligne `Attachment` (upload réussi mais
  enregistrement échoué à gérer).

## Références
- Modèle `Attachment` & pattern « paste-first » : [`../architecture.md`](../architecture.md)
- Vision (création sans friction, pièce jointe collée) : [`../vision.md`](../vision.md)
- Spécification produit (création rapide , pièces jointes) : [`../../SPEC.md`](../../SPEC.md)
- Spec fonctionnelle : [`../specs/0001-creation-ticket-rapide.md`](../specs/0001-creation-ticket-rapide.md)
- ADR liés : [`./0001-stack-nextjs-typescript.md`](./0001-stack-nextjs-typescript.md) · [`./0003-rbac-admin-rapporteur.md`](./0003-rbac-admin-rapporteur.md)
