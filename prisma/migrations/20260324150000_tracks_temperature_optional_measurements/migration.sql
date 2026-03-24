-- Add per-pool temperature tracking control
ALTER TABLE "Pool"
ADD COLUMN "tracksTemperature" BOOLEAN NOT NULL DEFAULT true;

-- Temperature range becomes optional when the pool does not track temperature
ALTER TABLE "Pool"
ALTER COLUMN "idealTemperatureMin" DROP NOT NULL,
ALTER COLUMN "idealTemperatureMax" DROP NOT NULL;

-- Measurement temperature is optional for non-heated pools
ALTER TABLE "Measurement"
ALTER COLUMN "temperature" DROP NOT NULL;
