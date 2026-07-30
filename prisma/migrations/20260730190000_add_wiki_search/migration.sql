-- AlterTable
ALTER TABLE "WikiPage" ADD COLUMN     "searchText" TEXT;


-- Index plein texte sur la colonne repliée. Prisma ne sait pas décrire un index
-- d'expression : il est donc écrit à la main ici.
--
-- `to_tsvector(regconfig, text)` est IMMUTABLE dans sa forme à deux arguments
-- (configuration explicite), ce qui est la condition pour l'indexer. La forme à
-- un argument dépend du réglage de session et ne le serait pas.
--
-- Sans cet index, chaque recherche balaie toute la table.
CREATE INDEX "WikiPage_searchText_idx"
  ON "WikiPage"
  USING GIN (to_tsvector('french', COALESCE("searchText", '')));
