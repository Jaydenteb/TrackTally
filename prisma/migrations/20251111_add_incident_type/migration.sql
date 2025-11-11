-- Add type field to Incident table
ALTER TABLE "Incident" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'incident';

-- Add index for type filtering
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- Add comment for documentation
COMMENT ON COLUMN "Incident"."type" IS 'Type of record: incident or commendation';
