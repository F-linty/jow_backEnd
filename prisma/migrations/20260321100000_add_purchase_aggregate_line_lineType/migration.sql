-- AlterTable
ALTER TABLE `PurchaseAggregateLine` ADD COLUMN `lineType` ENUM('MATERIAL', 'NON_MATERIAL') NULL;

