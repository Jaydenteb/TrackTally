-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- Seed legacy organization and backfill new columns
INSERT INTO "Organization" ("id", "name", "domain")
SELECT 'legacy-org', 'Legacy School', COALESCE($$shcolac.catholic.edu.au$$, 'legacy.local')
WHERE NOT EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

UPDATE "Teacher" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;
UPDATE "Classroom" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;
UPDATE "Student" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;
UPDATE "Incident" SET "organizationId" = 'legacy-org' WHERE "organizationId" IS NULL;

ALTER TABLE "Classroom" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Incident" ALTER COLUMN "organizationId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


