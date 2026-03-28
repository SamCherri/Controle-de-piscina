-- Create enums
CREATE TYPE "AdminUserRole" AS ENUM ('admin', 'operator');
CREATE TYPE "PoolProfileType" AS ENUM ('STANDARD', 'ADULTO', 'INFANTIL', 'AQUECIDA', 'COBERTA');
CREATE TYPE "MaintenanceTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- Alter role with safe cast preserving existing values
ALTER TABLE "AdminUser"
  ALTER COLUMN "role" TYPE "AdminUserRole"
  USING CASE
    WHEN "role" IN ('admin', 'operator') THEN "role"::"AdminUserRole"
    ELSE 'operator'::"AdminUserRole"
  END,
  ALTER COLUMN "role" SET DEFAULT 'admin';

-- Pool profile
ALTER TABLE "Pool"
  ADD COLUMN "profileType" "PoolProfileType" NOT NULL DEFAULT 'STANDARD';

-- Measurement relation to user
ALTER TABLE "Measurement"
  ADD COLUMN "measuredById" TEXT;

ALTER TABLE "Measurement"
  ADD CONSTRAINT "Measurement_measuredById_fkey"
  FOREIGN KEY ("measuredById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Measurement_measuredById_idx" ON "Measurement"("measuredById");

-- New domain entities
CREATE TABLE "MeasurementAttachment" (
  "id" TEXT NOT NULL,
  "measurementId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileMimeType" TEXT NOT NULL,
  "fileData" BYTEA,
  "filePath" TEXT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeasurementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MeasurementAttachment_measurementId_idx" ON "MeasurementAttachment"("measurementId");
ALTER TABLE "MeasurementAttachment" ADD CONSTRAINT "MeasurementAttachment_measurementId_fkey"
FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ChemicalApplication" (
  "id" TEXT NOT NULL,
  "measurementId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "notes" TEXT,
  "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChemicalApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChemicalApplication_measurementId_idx" ON "ChemicalApplication"("measurementId");
ALTER TABLE "ChemicalApplication" ADD CONSTRAINT "ChemicalApplication_measurementId_fkey"
FOREIGN KEY ("measurementId") REFERENCES "Measurement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MaintenanceTask" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "MaintenanceTaskStatus" NOT NULL DEFAULT 'OPEN',
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MaintenanceTask_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MaintenanceTask_poolId_status_idx" ON "MaintenanceTask"("poolId", "status");
CREATE INDEX "MaintenanceTask_assignedToId_idx" ON "MaintenanceTask"("assignedToId");
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_poolId_fkey"
FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MaintenanceTask" ADD CONSTRAINT "MaintenanceTask_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "InspectionChecklist" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "checklistItems" JSONB NOT NULL,
  "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "performedBy" TEXT,
  "notes" TEXT,
  CONSTRAINT "InspectionChecklist_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InspectionChecklist_poolId_performedAt_idx" ON "InspectionChecklist"("poolId", "performedAt" DESC);
ALTER TABLE "InspectionChecklist" ADD CONSTRAINT "InspectionChecklist_poolId_fkey"
FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PoolAlert" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PoolAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PoolAlert_poolId_severity_isResolved_idx" ON "PoolAlert"("poolId", "severity", "isResolved");
CREATE INDEX "PoolAlert_createdById_idx" ON "PoolAlert"("createdById");
ALTER TABLE "PoolAlert" ADD CONSTRAINT "PoolAlert_poolId_fkey"
FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PoolAlert" ADD CONSTRAINT "PoolAlert_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PublicShareConfig" (
  "id" TEXT NOT NULL,
  "poolId" TEXT NOT NULL,
  "isPublicEnabled" BOOLEAN NOT NULL DEFAULT true,
  "showHistoricalSummary" BOOLEAN NOT NULL DEFAULT true,
  "showResponsibleName" BOOLEAN NOT NULL DEFAULT true,
  "customMessage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicShareConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicShareConfig_poolId_key" ON "PublicShareConfig"("poolId");
ALTER TABLE "PublicShareConfig" ADD CONSTRAINT "PublicShareConfig_poolId_fkey"
FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
