-- AlterTable
ALTER TABLE `Organization` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Organization_deletedAt_idx` ON `Organization`(`deletedAt`);

-- AlterTable
ALTER TABLE `User` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `User_deletedAt_idx` ON `User`(`deletedAt`);
