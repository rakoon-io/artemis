-- CreateEnum
CREATE TYPE "TicketTemplate" AS ENUM ('NONE', 'REPORT');

-- AlterTable
ALTER TABLE "TicketType" ADD COLUMN     "template" "TicketTemplate" NOT NULL DEFAULT 'NONE';
