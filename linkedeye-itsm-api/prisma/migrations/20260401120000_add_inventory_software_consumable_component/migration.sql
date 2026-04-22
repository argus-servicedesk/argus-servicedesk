-- CreateEnum
CREATE TYPE "SoftwareCategory" AS ENUM ('OPERATING_SYSTEM', 'PRODUCTIVITY', 'SECURITY', 'MONITORING', 'DATABASE_SOFTWARE', 'DEVELOPMENT', 'COMMUNICATION', 'VIRTUALIZATION', 'BACKUP', 'NETWORKING', 'OTHER');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('PERPETUAL', 'SUBSCRIPTION', 'OPEN_SOURCE', 'OEM', 'TRIAL', 'FREEWARE', 'SITE_LICENSE', 'CONCURRENT', 'NAMED_USER');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED', 'PENDING');

-- CreateEnum
CREATE TYPE "ConsumableType" AS ENUM ('TONER', 'CARTRIDGE', 'INK', 'DRUM', 'PAPER', 'CABLE_SUPPLY', 'BATTERY', 'FILTER', 'LABEL', 'OTHER_CONSUMABLE');

-- AlterEnum
ALTER TYPE "CIType" ADD VALUE 'MONITOR';
ALTER TYPE "CIType" ADD VALUE 'PHONE';
ALTER TYPE "CIType" ADD VALUE 'PERIPHERAL';
ALTER TYPE "CIType" ADD VALUE 'RACK_UNIT';
ALTER TYPE "CIType" ADD VALUE 'PDU';
ALTER TYPE "CIType" ADD VALUE 'ENCLOSURE';
ALTER TYPE "CIType" ADD VALUE 'CABLE';
ALTER TYPE "CIType" ADD VALUE 'SIMCARD';

-- CreateTable
CREATE TABLE "Software" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "category" "SoftwareCategory" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "website" TEXT,
    "isOpenSource" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Software_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareVersion" (
    "id" TEXT NOT NULL,
    "softwareId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "arch" TEXT,
    "releaseDate" TIMESTAMP(3),
    "endOfSupport" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SoftwareVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareInstallation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "installDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstallDate" TIMESTAMP(3),
    "installedBy" TEXT,
    "licenseId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SoftwareInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoftwareLicense" (
    "id" TEXT NOT NULL,
    "softwareId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialKey" TEXT,
    "type" "LicenseType" NOT NULL DEFAULT 'PERPETUAL',
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "vendorId" TEXT,
    "poNumber" TEXT,
    "notes" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SoftwareLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComputerComponent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "componentType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "capacity" TEXT,
    "speed" TEXT,
    "interface" TEXT,
    "slot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INSTALLED',
    "notes" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ComputerComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumableItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ConsumableType" NOT NULL DEFAULT 'OTHER_CONSUMABLE',
    "manufacturer" TEXT,
    "model" TEXT,
    "compatibleWith" TEXT,
    "stockTotal" INTEGER NOT NULL DEFAULT 0,
    "stockUsed" INTEGER NOT NULL DEFAULT 0,
    "stockMin" INTEGER NOT NULL DEFAULT 5,
    "location" TEXT,
    "cost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsumableItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumableUsageLog" (
    "id" TEXT NOT NULL,
    "consumableId" TEXT NOT NULL,
    "assetId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "action" TEXT NOT NULL,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsumableUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Software_name_idx" ON "Software"("name");
CREATE INDEX "Software_category_idx" ON "Software"("category");
CREATE INDEX "Software_organizationId_idx" ON "Software"("organizationId");
CREATE INDEX "SoftwareVersion_softwareId_idx" ON "SoftwareVersion"("softwareId");
CREATE UNIQUE INDEX "SoftwareVersion_softwareId_version_key" ON "SoftwareVersion"("softwareId", "version");
CREATE INDEX "SoftwareInstallation_assetId_idx" ON "SoftwareInstallation"("assetId");
CREATE INDEX "SoftwareInstallation_versionId_idx" ON "SoftwareInstallation"("versionId");
CREATE INDEX "SoftwareInstallation_licenseId_idx" ON "SoftwareInstallation"("licenseId");
CREATE INDEX "SoftwareInstallation_organizationId_idx" ON "SoftwareInstallation"("organizationId");
CREATE INDEX "SoftwareLicense_softwareId_idx" ON "SoftwareLicense"("softwareId");
CREATE INDEX "SoftwareLicense_status_idx" ON "SoftwareLicense"("status");
CREATE INDEX "SoftwareLicense_expiryDate_idx" ON "SoftwareLicense"("expiryDate");
CREATE INDEX "SoftwareLicense_organizationId_idx" ON "SoftwareLicense"("organizationId");
CREATE INDEX "ComputerComponent_assetId_idx" ON "ComputerComponent"("assetId");
CREATE INDEX "ComputerComponent_componentType_idx" ON "ComputerComponent"("componentType");
CREATE INDEX "ComputerComponent_organizationId_idx" ON "ComputerComponent"("organizationId");
CREATE INDEX "ConsumableItem_type_idx" ON "ConsumableItem"("type");
CREATE INDEX "ConsumableItem_organizationId_idx" ON "ConsumableItem"("organizationId");
CREATE INDEX "ConsumableUsageLog_consumableId_idx" ON "ConsumableUsageLog"("consumableId");
CREATE INDEX "ConsumableUsageLog_createdAt_idx" ON "ConsumableUsageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Software" ADD CONSTRAINT "Software_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoftwareVersion" ADD CONSTRAINT "SoftwareVersion_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoftwareInstallation" ADD CONSTRAINT "SoftwareInstallation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoftwareInstallation" ADD CONSTRAINT "SoftwareInstallation_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "SoftwareVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoftwareInstallation" ADD CONSTRAINT "SoftwareInstallation_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "SoftwareLicense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoftwareInstallation" ADD CONSTRAINT "SoftwareInstallation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoftwareLicense" ADD CONSTRAINT "SoftwareLicense_softwareId_fkey" FOREIGN KEY ("softwareId") REFERENCES "Software"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoftwareLicense" ADD CONSTRAINT "SoftwareLicense_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SoftwareLicense" ADD CONSTRAINT "SoftwareLicense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ComputerComponent" ADD CONSTRAINT "ComputerComponent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ConfigurationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComputerComponent" ADD CONSTRAINT "ComputerComponent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsumableItem" ADD CONSTRAINT "ConsumableItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConsumableUsageLog" ADD CONSTRAINT "ConsumableUsageLog_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "ConsumableItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
