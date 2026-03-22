import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common';
import { OrgStatus, PurchaseLineType, PurchasePlanStatus } from '@prisma/client';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  createPlan = async (
    month: string,
    userId: number,
    body: {
      orgId?: number;
      planName?: string;
      shippingAddress?: string;
      status?: PurchasePlanStatus;
      lines?: Array<{
        lineType?: PurchaseLineType;
        materialItemId?: number;
        productTypeId?: number;
        materialCategoryId?: number;
        itemName?: string;
        itemImage?: string;
        brand?: string;
        spec?: string;
        unit?: string;
        demandQty?: number;
        unitPrice?: number;
        subtotal?: number;
        total?: number;
      }>;
    },
  ) => {
    if (!month?.trim()) throw new HttpException('月份不能为空', 400);
    const orgId = Number(body.orgId);
    if (!Number.isFinite(orgId)) throw new HttpException('组织不能为空', 400);

    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!org) throw new HttpException('组织不存在或已删除', 404);
    if (org.status !== OrgStatus.ACTIVE) {
      throw new HttpException('组织已停用，无法创建采购计划', 400);
    }
    const shippingAddress = body.shippingAddress?.trim();
    if (!shippingAddress) throw new HttpException('收货地址不能为空', 400);

    const status = body.status ?? PurchasePlanStatus.DRAFT;
    const created = await this.prisma.$transaction(async (tx) => {
      const createdPlan = await tx.purchasePlan.create({
        data: {
          month: month.trim(),
          orgId,
          createdByUserId: userId,
          planName: body.planName?.trim() || null,
          shippingAddress,
          status,
          lines: body.lines?.length
            ? {
                create: body.lines.map((line) => {
                  // 小计兜底：若前端未传，按数量*单价计算
                  const qty = Number(line.demandQty ?? 0);
                  const price = Number(line.unitPrice ?? 0);
                  const subtotal =
                    line.subtotal === undefined || line.subtotal === null
                      ? qty * price
                      : Number(line.subtotal);
                  const total =
                    line.total === undefined || line.total === null
                      ? qty * price
                      : Number(line.total);
                  return {
                  lineType: line.lineType ?? PurchaseLineType.MATERIAL,
                  materialItemId: Number.isFinite(Number(line.materialItemId))
                    ? Number(line.materialItemId)
                    : null,
                  productTypeId: line.productTypeId ?? null,
                  materialCategoryId: line.materialCategoryId ?? null,
                  itemName: line.itemName?.trim() || null,
                  itemImage: line.itemImage?.trim() || null,
                  brand: line.brand?.trim() || null,
                  spec: line.spec?.trim() || null,
                  unit: line.unit?.trim() || null,
                  demandQty: line.demandQty ?? null,
                  unitPrice: line.unitPrice ?? null,
                  subtotal,
                  total,
                };
                }),
              }
            : undefined,
        },
        include: {
          org: { select: { id: true, name: true } },
          createdBy: { select: { id: true, account: true } },
          lines: true,
        },
      });

      const nonMaterialRows = createdPlan.lines.filter(
        (line) => line.lineType === PurchaseLineType.NON_MATERIAL,
      );
      if (nonMaterialRows.length) {
        const createRows = nonMaterialRows.map((line) => {
          if (
            !line.productTypeId ||
            !line.materialCategoryId ||
            !line.itemName?.trim()
          ) {
            throw new HttpException('非图谱明细缺少必要字段', 400);
          }
          return {
            orgId,
            createdByUserId: userId,
            sourcePlanId: createdPlan.id,
            sourcePlanLineId: line.id,
            productTypeId: line.productTypeId,
            materialCategoryId: line.materialCategoryId,
            itemName: line.itemName.trim(),
            itemImage: line.itemImage?.trim() || null,
            brand: line.brand?.trim() || null,
            spec: line.spec?.trim() || null,
            unit: line.unit?.trim() || null,
            demandQty: line.demandQty ?? null,
            unitPrice: line.unitPrice ?? null,
            subtotal: line.subtotal ?? null,
            total: line.total ?? null,
          };
        });
        await tx.nonMaterialItem.createMany({ data: createRows });
      }

      return createdPlan;
    });

    return created;
  };

  listPlans = async (
    month: string,
    userId: number,
    query: { page?: string; pageSize?: string; keyword?: string },
  ) => {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where: any = { month, createdByUserId: userId };
    if (query.keyword?.trim()) {
      where.planName = { contains: query.keyword.trim() };
    }

    const [total, rows] = await Promise.all([
      this.prisma.purchasePlan.count({ where }),
      this.prisma.purchasePlan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          org: { select: { id: true, name: true } },
          createdBy: { select: { id: true, account: true } },
          _count: { select: { lines: true } },
        },
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      month: row.month,
      orgId: row.orgId,
      orgName: row.org?.name ?? '',
      planName: row.planName ?? '',
      shippingAddress: row.shippingAddress ?? '',
      status: row.status,
      createdBy: row.createdBy?.account ?? '',
      lineCount: row._count.lines,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { total, page, pageSize, items };
  };

  getPlanDetail = async (month: string, id: number, userId: number) => {
    const row = await this.prisma.purchasePlan.findFirst({
      where: { id, month, createdByUserId: userId },
      include: {
        org: { select: { id: true, name: true } },
        createdBy: { select: { id: true, account: true } },
        lines: {
          include: {
            productType: { select: { id: true, name: true } },
            materialCategory: { select: { id: true, name: true } },
            materialItem: { select: { id: true, itemImage: true } },
          },
        },
      },
    });
    if (!row) throw new HttpException('采购计划不存在或无权限查看', 404);
    return row;
  };

  runAggregate = async (month: string, body: { orgId?: number }) => {
    if (!month?.trim()) throw new HttpException('月份不能为空', 400);
    const orgId = Number(body.orgId);
    if (!Number.isFinite(orgId)) throw new HttpException('组织不能为空', 400);
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!org) throw new HttpException('组织不存在或已删除', 404);
    if (org.status !== OrgStatus.ACTIVE) {
      throw new HttpException('组织已停用，无法执行聚合', 400);
    }

    const plans = await this.prisma.purchasePlan.findMany({
      where: {
        month,
        orgId,
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
      include: { lines: true },
    });
    const sourcePlanId = plans.length
      ? plans.reduce((max, plan) => (plan.id > max ? plan.id : max), plans[0].id)
      : null;

    const agg = await this.prisma.purchaseAggregate.create({
      data: {
        month,
        orgId,
        sourcePlanId,
        status: 'RUNNING',
      },
    });

    const bucket = new Map<
      string,
      {
        lineType: string | null;
        productTypeId: number | null;
        materialCategoryId: number | null;
        unit: string | null;
        demandQty: number;
        subtotal: number;
        total: number;
      }
    >();

    plans.forEach((plan) => {
      plan.lines.forEach((line) => {
        const key = `${line.lineType ?? 'null'}-${line.productTypeId ?? 'null'}-${line.materialCategoryId ?? 'null'}-${
          line.unit ?? ''
        }`;
        const prev = bucket.get(key) ?? {
          lineType: line.lineType ?? null,
          productTypeId: line.productTypeId ?? null,
          materialCategoryId: line.materialCategoryId ?? null,
          unit: line.unit ?? null,
          demandQty: 0,
          subtotal: 0,
          total: 0,
        };
        prev.demandQty += Number(line.demandQty ?? 0);
        const qty = Number(line.demandQty ?? 0);
        const price = Number(line.unitPrice ?? 0);
        const subtotal =
          line.subtotal === null || line.subtotal === undefined
            ? qty * price
            : Number(line.subtotal ?? 0);
        const total =
          line.total === null || line.total === undefined
            ? qty * price
            : Number(line.total ?? 0);
        prev.subtotal += subtotal;
        prev.total += total;
        bucket.set(key, prev);
      });
    });

    const lineRows = Array.from(bucket.values());
    if (lineRows.length) {
      await this.prisma.purchaseAggregateLine.createMany({
        data: lineRows.map((line) => ({
          aggregateId: agg.id,
          lineType: line.lineType as any,
          productTypeId: line.productTypeId,
          materialCategoryId: line.materialCategoryId,
          unit: line.unit,
          demandQty: line.demandQty,
          subtotal: line.subtotal,
          total: line.total,
        })),
      });
    }

    await this.prisma.purchaseAggregate.update({
      where: { id: agg.id },
      data: { status: 'DONE' },
    });

    return {
      aggregateId: agg.id,
      month,
      orgId,
      sourcePlanCount: plans.length,
      lineCount: lineRows.length,
    };
  };

  getAggregate = async (
    month: string,
    query: { orgId?: string; aggregateId?: string; planId?: string; lineType?: string },
  ) => {
    const orgId = Number(query.orgId);
    if (!Number.isFinite(orgId)) throw new HttpException('组织不能为空', 400);

    const aggregateId = query.aggregateId?.trim() ? Number(query.aggregateId) : null;
    if (aggregateId !== null && !Number.isFinite(aggregateId)) {
      throw new HttpException('单号（聚合ID）格式不正确', 400);
    }
    const planId = query.planId?.trim() ? Number(query.planId) : null;
    if (planId !== null && !Number.isFinite(planId)) {
      throw new HttpException('月度采购计划单号格式不正确', 400);
    }

    const lineType = query.lineType?.trim();
    const validLineTypes = new Set(['MATERIAL', 'NON_MATERIAL']);
    const lineTypeFilter = lineType && validLineTypes.has(lineType) ? lineType : null;

    const findOptions: any = {
      where: aggregateId ? { id: aggregateId, month, orgId } : { month, orgId },
      include: {
        org: { select: { id: true, name: true } },
        lines: {
          ...(lineTypeFilter ? { where: { lineType: lineTypeFilter as any } } : {}),
          include: {
            productType: { select: { id: true, name: true } },
            materialCategory: { select: { id: true, name: true } },
          },
        },
      },
    };

    if (!aggregateId) {
      findOptions.orderBy = { id: 'desc' };
    }

    const agg = await this.prisma.purchaseAggregate.findFirst(findOptions);
    const sourcePlan = await this.prisma.purchasePlan.findFirst({
      where: {
        ...(planId
          ? { id: planId }
          : agg?.sourcePlanId
            ? { id: agg.sourcePlanId }
            : {}),
        month,
        orgId,
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
      orderBy: { id: 'desc' },
      include: {
        createdBy: { select: { id: true, account: true } },
        lines: {
          ...(lineTypeFilter ? { where: { lineType: lineTypeFilter as any } } : {}),
          include: {
            productType: { select: { id: true, name: true } },
            materialCategory: { select: { id: true, name: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!agg) {
      return {
        month,
        orgId,
        status: 'INIT',
        sourcePlan: sourcePlan
          ? {
              id: sourcePlan.id,
              orgId: sourcePlan.orgId,
              planName: sourcePlan.planName ?? '',
              shippingAddress: sourcePlan.shippingAddress ?? '',
              createdBy: sourcePlan.createdBy?.account ?? '',
              createdAt: sourcePlan.createdAt,
            }
          : null,
        sourcePlanLines: sourcePlan?.lines ?? [],
        lines: [],
      };
    }
    return {
      ...agg,
      sourcePlan: sourcePlan
        ? {
            id: sourcePlan.id,
            orgId: sourcePlan.orgId,
            planName: sourcePlan.planName ?? '',
            shippingAddress: sourcePlan.shippingAddress ?? '',
            createdBy: sourcePlan.createdBy?.account ?? '',
            createdAt: sourcePlan.createdAt,
          }
        : null,
      sourcePlanLines: sourcePlan?.lines ?? [],
    };
  };

  listAggregateHistory = async (
    month: string,
    query: { orgId?: string; page?: string; pageSize?: string },
  ) => {
    const orgId = Number(query.orgId);
    if (!Number.isFinite(orgId)) throw new HttpException('组织不能为空', 400);

    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where = { month, orgId };
    const [total, rows] = await Promise.all([
      this.prisma.purchaseAggregate.count({ where }),
      this.prisma.purchaseAggregate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          org: { select: { id: true, name: true } },
        },
      }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      planId: row.sourcePlanId ?? null,
      month: row.month,
      orgId: row.orgId,
      orgName: row.org?.name ?? '',
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { total, page, pageSize, items };
  };
}

