-- AlterTable: Enhance AuditLog with organization scope, severity, status, and renamed fields
-- Rename entityType -> resourceType, entityId -> resourceId
-- Merge oldData/newData into single changes JSON column
-- Add organizationId, severity, status columns

-- Step 1: Add new columns
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "severity" TEXT NOT NULL DEFAULT 'INFO';
ALTER TABLE "AuditLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "AuditLog" ADD COLUMN "changes" JSONB;

-- Step 2: Rename columns (entityType -> resourceType, entityId -> resourceId)
ALTER TABLE "AuditLog" RENAME COLUMN "entityType" TO "resourceType";
ALTER TABLE "AuditLog" RENAME COLUMN "entityId" TO "resourceId";

-- Step 3: Migrate oldData/newData into changes JSON
UPDATE "AuditLog"
SET "changes" = jsonb_build_object('before', "oldData", 'after', "newData")
WHERE "oldData" IS NOT NULL OR "newData" IS NOT NULL;

-- Step 4: Drop old columns
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "oldData";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "newData";

-- Step 5: Add foreign key for organizationId
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add new indexes
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- Step 7: Drop old composite index and recreate with new column names
DROP INDEX IF EXISTS "AuditLog_entityType_entityId_idx";
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");
