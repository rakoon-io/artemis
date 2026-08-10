-- Liens entre tickets : « bloque », « doublon de », « lié à ».
--
-- Migration purement ADDITIVE : une table et un type, aucune colonne existante
-- touchée. L'application d'avant continue de fonctionner sur la base d'après,
-- ce qui autorise à migrer avant de déployer plutôt que l'inverse.

CREATE TYPE "TicketLinkType" AS ENUM ('BLOCKS', 'DUPLICATES', 'RELATES');

CREATE TABLE "TicketLink" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" "TicketLinkType" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketLink_pkey" PRIMARY KEY ("id")
);

-- Un seul lien par couple de tickets, quel que soit son type : deux tickets
-- n'entretiennent qu'une relation à la fois, et vouloir la changer remplace
-- l'existante au lieu d'en empiler une qui la contredirait.
CREATE UNIQUE INDEX "TicketLink_sourceId_targetId_key" ON "TicketLink"("sourceId", "targetId");
CREATE INDEX "TicketLink_sourceId_idx" ON "TicketLink"("sourceId");
CREATE INDEX "TicketLink_targetId_idx" ON "TicketLink"("targetId");

-- Supprimer un ticket emporte ses liens, dans les deux sens : un lien vers un
-- ticket disparu ne renseignerait plus rien.
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketLink" ADD CONSTRAINT "TicketLink_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
