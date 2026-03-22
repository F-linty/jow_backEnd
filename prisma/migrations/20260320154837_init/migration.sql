-- CreateTable
CREATE TABLE `Organization` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `parentId` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Organization_parentId_idx`(`parentId`),
    INDEX `Organization_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrgControl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fromOrgId` INTEGER NOT NULL,
    `toOrgId` INTEGER NOT NULL,
    `relationType` VARCHAR(50) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OrgControl_fromOrgId_idx`(`fromOrgId`),
    INDEX `OrgControl_toOrgId_idx`(`toOrgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `account` VARCHAR(64) NOT NULL,
    `passWord` VARCHAR(255) NOT NULL,
    `userName` VARCHAR(255) NULL,
    `avatar` VARCHAR(512) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `orgId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_account_key`(`account`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductType` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `parentId` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductType_parentId_idx`(`parentId`),
    INDEX `ProductType_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialCategory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `parentId` INTEGER NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `sort` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaterialCategory_parentId_idx`(`parentId`),
    INDEX `MaterialCategory_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productTypeId` INTEGER NOT NULL,
    `materialCategoryId` INTEGER NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `brand` VARCHAR(255) NULL,
    `spec` VARCHAR(255) NULL,
    `unit` VARCHAR(32) NULL,
    `demandQty` DECIMAL(18, 2) NULL,
    `unitPrice` DECIMAL(18, 2) NULL,
    `subtotal` DECIMAL(18, 2) NULL,
    `total` DECIMAL(18, 2) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaterialItem_productTypeId_idx`(`productTypeId`),
    INDEX `MaterialItem_materialCategoryId_idx`(`materialCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NonMaterialItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orgId` INTEGER NOT NULL,
    `createdByUserId` INTEGER NOT NULL,
    `sourcePlanId` INTEGER NULL,
    `sourcePlanLineId` INTEGER NULL,
    `productTypeId` INTEGER NOT NULL,
    `materialCategoryId` INTEGER NOT NULL,
    `itemName` VARCHAR(255) NOT NULL,
    `brand` VARCHAR(255) NULL,
    `spec` VARCHAR(255) NULL,
    `unit` VARCHAR(32) NULL,
    `demandQty` DECIMAL(18, 2) NULL,
    `unitPrice` DECIMAL(18, 2) NULL,
    `subtotal` DECIMAL(18, 2) NULL,
    `total` DECIMAL(18, 2) NULL,
    `adopted` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NonMaterialItem_sourcePlanLineId_key`(`sourcePlanLineId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchasePlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month` VARCHAR(7) NOT NULL,
    `orgId` INTEGER NOT NULL,
    `createdByUserId` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
    `planName` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchasePlan_month_idx`(`month`),
    INDEX `PurchasePlan_orgId_idx`(`orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchasePlanLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `planId` INTEGER NOT NULL,
    `lineType` ENUM('MATERIAL', 'NON_MATERIAL') NOT NULL,
    `productTypeId` INTEGER NULL,
    `materialCategoryId` INTEGER NULL,
    `materialItemId` INTEGER NULL,
    `nonMaterialItemId` INTEGER NULL,
    `itemName` VARCHAR(255) NULL,
    `brand` VARCHAR(255) NULL,
    `spec` VARCHAR(255) NULL,
    `unit` VARCHAR(32) NULL,
    `demandQty` DECIMAL(18, 2) NULL,
    `unitPrice` DECIMAL(18, 2) NULL,
    `subtotal` DECIMAL(18, 2) NULL,
    `total` DECIMAL(18, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PurchasePlanLine_nonMaterialItemId_key`(`nonMaterialItemId`),
    INDEX `PurchasePlanLine_planId_idx`(`planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseAggregate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month` VARCHAR(7) NOT NULL,
    `orgId` INTEGER NOT NULL,
    `status` ENUM('INIT', 'RUNNING', 'DONE', 'FAILED') NOT NULL DEFAULT 'INIT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PurchaseAggregate_month_idx`(`month`),
    INDEX `PurchaseAggregate_orgId_idx`(`orgId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PurchaseAggregateLine` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `aggregateId` INTEGER NOT NULL,
    `productTypeId` INTEGER NULL,
    `materialCategoryId` INTEGER NULL,
    `unit` VARCHAR(191) NULL,
    `demandQty` DECIMAL(18, 2) NULL,
    `unitPrice` DECIMAL(18, 2) NULL,
    `subtotal` DECIMAL(18, 2) NULL,
    `total` DECIMAL(18, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Organization` ADD CONSTRAINT `Organization_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrgControl` ADD CONSTRAINT `OrgControl_fromOrgId_fkey` FOREIGN KEY (`fromOrgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrgControl` ADD CONSTRAINT `OrgControl_toOrgId_fkey` FOREIGN KEY (`toOrgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductType` ADD CONSTRAINT `ProductType_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ProductType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialCategory` ADD CONSTRAINT `MaterialCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `MaterialCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialItem` ADD CONSTRAINT `MaterialItem_productTypeId_fkey` FOREIGN KEY (`productTypeId`) REFERENCES `ProductType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialItem` ADD CONSTRAINT `MaterialItem_materialCategoryId_fkey` FOREIGN KEY (`materialCategoryId`) REFERENCES `MaterialCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonMaterialItem` ADD CONSTRAINT `NonMaterialItem_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonMaterialItem` ADD CONSTRAINT `NonMaterialItem_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonMaterialItem` ADD CONSTRAINT `NonMaterialItem_sourcePlanId_fkey` FOREIGN KEY (`sourcePlanId`) REFERENCES `PurchasePlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonMaterialItem` ADD CONSTRAINT `NonMaterialItem_productTypeId_fkey` FOREIGN KEY (`productTypeId`) REFERENCES `ProductType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NonMaterialItem` ADD CONSTRAINT `NonMaterialItem_materialCategoryId_fkey` FOREIGN KEY (`materialCategoryId`) REFERENCES `MaterialCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlan` ADD CONSTRAINT `PurchasePlan_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlan` ADD CONSTRAINT `PurchasePlan_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlanLine` ADD CONSTRAINT `PurchasePlanLine_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `PurchasePlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlanLine` ADD CONSTRAINT `PurchasePlanLine_productTypeId_fkey` FOREIGN KEY (`productTypeId`) REFERENCES `ProductType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlanLine` ADD CONSTRAINT `PurchasePlanLine_materialCategoryId_fkey` FOREIGN KEY (`materialCategoryId`) REFERENCES `MaterialCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlanLine` ADD CONSTRAINT `PurchasePlanLine_materialItemId_fkey` FOREIGN KEY (`materialItemId`) REFERENCES `MaterialItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchasePlanLine` ADD CONSTRAINT `PurchasePlanLine_nonMaterialItemId_fkey` FOREIGN KEY (`nonMaterialItemId`) REFERENCES `NonMaterialItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseAggregate` ADD CONSTRAINT `PurchaseAggregate_orgId_fkey` FOREIGN KEY (`orgId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseAggregateLine` ADD CONSTRAINT `PurchaseAggregateLine_aggregateId_fkey` FOREIGN KEY (`aggregateId`) REFERENCES `PurchaseAggregate`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseAggregateLine` ADD CONSTRAINT `PurchaseAggregateLine_productTypeId_fkey` FOREIGN KEY (`productTypeId`) REFERENCES `ProductType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PurchaseAggregateLine` ADD CONSTRAINT `PurchaseAggregateLine_materialCategoryId_fkey` FOREIGN KEY (`materialCategoryId`) REFERENCES `MaterialCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
