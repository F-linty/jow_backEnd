-- AlterTable
ALTER TABLE `ProductType` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `ProductType_deletedAt_idx` ON `ProductType`(`deletedAt`);

-- AlterTable
ALTER TABLE `MaterialCategory` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `MaterialCategory_deletedAt_idx` ON `MaterialCategory`(`deletedAt`);
