-- Diagnostic: List all tables in the public schema
-- Run this to see what tables actually exist
-- Make sure to click "Run" (not "Explain")

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
