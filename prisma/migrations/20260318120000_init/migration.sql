-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('NORMAL', 'ATTENTION', 'CRITICAL');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condominium" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Condominium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "condominiumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "locationNote" TEXT,
    "idealChlorineMin" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "idealChlorineMax" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "idealPhMin" DOUBLE PRECISION NOT NULL DEFAULT 7.2,
    "idealPhMax" DOUBLE PRECISION NOT NULL DEFAULT 7.8,
    "idealAlkalinityMin" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "idealAlkalinityMax" DOUBLE PRECISION NOT NULL DEFAULT 120,
    "idealHardnessMin" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "idealHardnessMax" DOUBLE PRECISION NOT NULL DEFAULT 400,
    "idealTemperatureMin" DOUBLE PRECISION NOT NULL DEFAULT 24,
    "idealTemperatureMax" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "chlorine" DOUBLE PRECISION NOT NULL,
    "ph" DOUBLE PRECISION NOT NULL,
    "alkalinity" DOUBLE PRECISION NOT NULL,
    "hardness" DOUBLE PRECISION NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "productsApplied" TEXT NOT NULL,
    "observations" TEXT,
    "photoPath" TEXT,
    "chlorineStatus" "PoolStatus" NOT NULL,
    "phStatus" "PoolStatus" NOT NULL,
    "alkalinityStatus" "PoolStatus" NOT NULL,
    "hardnessStatus" "PoolStatus" NOT NULL,
    "temperatureStatus" "PoolStatus" NOT NULL,
    "overallStatus" "PoolStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Condominium_slug_key" ON "Condominium"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_slug_key" ON "Pool"("slug");

-- CreateIndex
CREATE INDEX "Pool_condominiumId_idx" ON "Pool"("condominiumId");

-- CreateIndex
CREATE INDEX "Measurement_poolId_measuredAt_idx" ON "Measurement"("poolId", "measuredAt" DESC);

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_condominiumId_fkey" FOREIGN KEY ("condominiumId") REFERENCES "Condominium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Measurement" ADD CONSTRAINT "Measurement_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
