-- Add fixed cover photo fields for pool resident mode
ALTER TABLE "Pool"
ADD COLUMN "coverPhotoData" BYTEA,
ADD COLUMN "coverPhotoMimeType" TEXT;
