-- Rattacher un SPRINT à une VERSION : le travail d'une itération sort dans une
-- version, et ses tickets appartiennent alors à cette version sans qu'on ait à
-- les y rattacher un par un.
--
-- Migration ADDITIVE : une colonne nullable, aucune donnée touchée. Toutes les
-- versions existantes restent telles quelles, sans sprint rattaché.

ALTER TABLE "Sprint" ADD COLUMN "releaseId" TEXT;

CREATE INDEX "Sprint_releaseId_idx" ON "Sprint"("releaseId");

-- `SET NULL` : supprimer une version ne doit pas emporter l'itération, qui a eu
-- lieu de toute façon.
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_releaseId_fkey"
    FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE SET NULL ON UPDATE CASCADE;
