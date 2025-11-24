-- Migration: Add LMS Provider support to Organization
-- This adds the ability for organizations to specify their LMS provider (TrackTally or SIMON)

-- First, let's check what the actual table name is (run this first to diagnose)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE '%organization%';

-- Step 1: Create the LmsProvider enum type (if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE "LmsProvider" AS ENUM ('TRACKTALLY', 'SIMON');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

-- Step 2: Add lmsProvider column to Organization table
-- Try both possible table names (Prisma uses quoted PascalCase)
DO $$
BEGIN
  -- Try with quoted PascalCase first (Prisma default)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Organization') THEN
    ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "lmsProvider" "LmsProvider" DEFAULT 'TRACKTALLY';
    RAISE NOTICE 'Added lmsProvider to "Organization" table';

  -- Try lowercase if PascalCase doesn't exist
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization') THEN
    ALTER TABLE organization ADD COLUMN IF NOT EXISTS "lmsProvider" "LmsProvider" DEFAULT 'TRACKTALLY';
    RAISE NOTICE 'Added lmsProvider to organization table';

  ELSE
    RAISE EXCEPTION 'Organization table not found in any case variation';
  END IF;
END $$;

-- Step 3: Verify the changes (checks both possible table names)
SELECT
  t.table_name,
  c.column_name,
  c.data_type,
  c.column_default
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_name ILIKE 'organization'
  AND c.column_name = 'lmsProvider';
