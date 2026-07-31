-- ADRESSES E-MAIL CANONIQUES : minuscules, sans espaces autour.
--
-- L'application canonise désormais à la frontière (cf. `src/lib/email-address.ts`),
-- mais les lignes déjà écrites, elles, gardent la casse de leur saisie. Tant
-- qu'elles la gardent, la connexion de leur titulaire dépend de la façon dont il
-- tape son adresse.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ON REFUSE PLUTÔT QUE DE CHOISIR À LA PLACE DE L'EXPLOITANT
--
-- Si deux comptes ne diffèrent que par la casse, abaisser la casse violerait la
-- contrainte d'unicité. Fusionner ces comptes, ou en supprimer un, engage des
-- tickets, des commentaires et des appartenances : ce n'est pas à une migration
-- de le décider en silence. Elle s'interrompt donc, en nommant les adresses en
-- cause, et la transaction annule tout - la base reste exactement dans l'état
-- où elle était.
DO $$
DECLARE
  doublons text;
BEGIN
  SELECT string_agg(canonique, ', ' ORDER BY canonique)
    INTO doublons
    FROM (
      SELECT lower(btrim(email)) AS canonique
        FROM "User"
       GROUP BY 1
      HAVING count(*) > 1
    ) AS collisions;

  IF doublons IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration interrompue : ces adresses désignent plusieurs comptes une fois mises en minuscules (%). Fusionnez ou renommez ces comptes, puis relancez la migration.',
      doublons;
  END IF;
END $$;

UPDATE "User"
   SET email = lower(btrim(email))
 WHERE email <> lower(btrim(email));

-- ─────────────────────────────────────────────────────────────────────────────
-- LA GARANTIE, CÔTÉ BASE
--
-- La canonisation applicative suffit tant que personne ne l'oublie. Ce dépôt a
-- déjà connu la faute exacte que cela produit : cinq voies d'écriture, quatre
-- qui vérifiaient le type déclaré, une qui l'avait oublié. Un index rend
-- l'oubli impossible plutôt qu'improbable.
--
-- Trois choses ont été MESURÉES avant de l'écrire, car Prisma ne sait pas
-- modéliser un index sur expression :
--   1. `prisma migrate diff`, sur une base qui porte cet index, produit une
--      migration VIDE : le moteur ne le voit pas, et ne cherchera donc pas à le
--      supprimer lors d'une prochaine migration ;
--   2. sa violation remonte en `P2002`, code que les créations d'utilisateur
--      interceptent déjà pour répondre « Cet e-mail est déjà utilisé » ;
--   3. il se crée sans risque ici : le garde ci-dessus a déjà interrompu la
--      migration s'il restait la moindre collision.
--
-- Conséquence à connaître : cet index n'apparaît pas dans `schema.prisma`. Il
-- n'existe que par cette migration. C'est le prix de la garantie.
CREATE UNIQUE INDEX "User_email_lower_key" ON "User" (lower(email));
