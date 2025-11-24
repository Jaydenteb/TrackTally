-- ============================================================================
-- COMPLETE DATABASE MIGRATION FOR TRACKTALLY
-- This file combines all migrations plus the LMS provider feature
-- Run this in your Neon SQL Editor to set up the entire database
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Initial Schema (20251105_init_postgres)
-- ============================================================================

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "isSpecialist" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "homeroomTeacherId" TEXT,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherClass" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "guardians" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "classroomId" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "classroomId" TEXT,
    "classCode" TEXT,
    "teacherEmail" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "actionTaken" TEXT,
    "note" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClass_teacherId_classroomId_key" ON "TeacherClass"("teacherId", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_uuid_key" ON "Incident"("uuid");

-- CreateIndex
CREATE INDEX "Incident_timestamp_idx" ON "Incident"("timestamp");

-- CreateIndex
CREATE INDEX "Incident_teacherEmail_idx" ON "Incident"("teacherEmail");

-- CreateIndex
CREATE INDEX "Incident_classroomId_idx" ON "Incident"("classroomId");

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_homeroomTeacherId_fkey" FOREIGN KEY ("homeroomTeacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClass" ADD CONSTRAINT "TeacherClass_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClass" ADD CONSTRAINT "TeacherClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("studentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- MIGRATION 2: Add Organizations (20251107_add_organizations)
-- ============================================================================

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "organizationId" TEXT;

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

-- Seed legacy organization (only if there's existing data)
INSERT INTO "Organization" ("id", "name", "domain")
SELECT 'legacy-org', 'Legacy School', 'shcolac.catholic.edu.au'
WHERE EXISTS (SELECT 1 FROM "Teacher" LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

-- Backfill organization columns (only if legacy org was created)
UPDATE "Teacher" SET "organizationId" = 'legacy-org'
WHERE "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

UPDATE "Classroom" SET "organizationId" = 'legacy-org'
WHERE "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

UPDATE "Student" SET "organizationId" = 'legacy-org'
WHERE "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

UPDATE "Incident" SET "organizationId" = 'legacy-org'
WHERE "organizationId" IS NULL
  AND EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org');

-- Only set NOT NULL if we have the legacy org (empty DB won't have it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Organization" WHERE "id" = 'legacy-org') THEN
    ALTER TABLE "Classroom" ALTER COLUMN "organizationId" SET NOT NULL;
    ALTER TABLE "Student" ALTER COLUMN "organizationId" SET NOT NULL;
    ALTER TABLE "Incident" ALTER COLUMN "organizationId" SET NOT NULL;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- MIGRATION 3: Add Mobile Auth Ticket (20251110_add_mobile_auth_ticket)
-- ============================================================================

-- CreateTable
CREATE TABLE "MobileAuthTicket" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "transferToken" TEXT,
    "redirectPath" TEXT NOT NULL DEFAULT '/teacher',
    "sessionToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAuthTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileAuthTicket_state_key" ON "MobileAuthTicket"("state");

-- CreateIndex
CREATE UNIQUE INDEX "MobileAuthTicket_transferToken_key" ON "MobileAuthTicket"("transferToken");

-- CreateIndex
CREATE INDEX "MobileAuthTicket_expiresAt_idx" ON "MobileAuthTicket"("expiresAt");

-- ============================================================================
-- MIGRATION 4: Add Incident Type (20251111_add_incident_type)
-- ============================================================================

-- Add type field to Incident table
ALTER TABLE "Incident" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'incident';

-- Add index for type filtering
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- Add comment for documentation
COMMENT ON COLUMN "Incident"."type" IS 'Type of record: incident or commendation';

-- ============================================================================
-- MIGRATION 5: Add LMS Provider (NEW)
-- ============================================================================

-- Create the LmsProvider enum type
CREATE TYPE "LmsProvider" AS ENUM ('TRACKTALLY', 'SIMON');

-- Add lmsProvider column to Organization table
ALTER TABLE "Organization" ADD COLUMN "lmsProvider" "LmsProvider" DEFAULT 'TRACKTALLY';

-- ============================================================================
-- VERIFICATION QUERIES (Optional - comment out if you don't want to see them)
-- ============================================================================

-- Verify all tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify Organization table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Organization'
ORDER BY ordinal_position;
