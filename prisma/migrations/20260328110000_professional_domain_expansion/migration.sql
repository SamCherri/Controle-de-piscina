-- Promote AdminUser role from free-text to enum, preserving legacy values safely.
CREATE TYPE "AdminUserRole" AS ENUM ('admin', 'operator');

ALTER TABLE "AdminUser"
  ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "AdminUser"
  ALTER COLUMN "role" TYPE "AdminUserRole"
  USING CASE
    WHEN "role" IN ('admin', 'operator') THEN "role"::"AdminUserRole"
    ELSE 'operator'::"AdminUserRole"
  END;

ALTER TABLE "AdminUser"
  ALTER COLUMN "role" SET DEFAULT 'admin'::"AdminUserRole";

-- Track authenticated user that launched each measurement.
ALTER TABLE "Measurement"
  ADD COLUMN "measuredById" TEXT;

ALTER TABLE "Measurement"
  ADD CONSTRAINT "Measurement_measuredById_fkey"
  FOREIGN KEY ("measuredById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Measurement_measuredById_idx" ON "Measurement"("measuredById");
