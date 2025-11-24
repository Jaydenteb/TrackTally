-- Migration: Add LMS Provider support to Organization
-- This adds the ability for organizations to specify their LMS provider (TrackTally or SIMON)

-- Step 1: Create the LmsProvider enum type (if it doesn't exist)
DO $$ BEGIN
  CREATE TYPE "LmsProvider" AS ENUM ('TRACKTALLY', 'SIMON');
EXCEPTION
  WHEN duplicate_object THEN
    -- Type already exists, skip
    RAISE NOTICE 'LmsProvider enum already exists, skipping creation';
END $$;

-- Step 2: Add lmsProvider column to Organization table (if it doesn't exist)
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "lmsProvider" "LmsProvider" DEFAULT 'TRACKTALLY';

-- Step 3: Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Organization'
  AND column_name = 'lmsProvider';
