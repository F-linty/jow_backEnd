import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common';

@Injectable()
export class HomeService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [materialCount, nonMaterialCount, groupedMonths, groupedOrgs] =
      await Promise.all([
        this.prisma.purchasePlanLine.count({
          where: { lineType: 'MATERIAL' },
        }),
        this.prisma.purchasePlanLine.count({
          where: { lineType: 'NON_MATERIAL' },
        }),
        this.prisma.purchasePlan.groupBy({
          by: ['month'],
          _count: { _all: true },
          orderBy: { month: 'asc' },
        }),
        this.prisma.purchasePlan.groupBy({
          by: ['orgId'],
          _count: { _all: true },
        }),
      ]);

    const monthKeys = groupedMonths.slice(-6).map((row) => row.month);
    const monthLineTypeStats =
      monthKeys.length === 0
        ? []
        : await Promise.all(
            monthKeys.map(async (month) => {
              const [material, nonMaterial] = await Promise.all([
                this.prisma.purchasePlanLine.count({
                  where: { lineType: 'MATERIAL', plan: { month } },
                }),
                this.prisma.purchasePlanLine.count({
                  where: { lineType: 'NON_MATERIAL', plan: { month } },
                }),
              ]);
              return { month, material, nonMaterial };
            }),
          );

    const orgIds = groupedOrgs.map((g) => g.orgId);
    const orgRows =
      orgIds.length > 0
        ? await this.prisma.organization.findMany({
            where: { id: { in: orgIds } },
            select: { id: true, name: true },
          })
        : [];
    const idToName = Object.fromEntries(orgRows.map((o) => [o.id, o.name]));
    const orgStats = [...groupedOrgs]
      .sort((a, b) => b._count._all - a._count._all)
      .map((row) => ({
        orgId: row.orgId,
        orgName: idToName[row.orgId] ?? `组织#${row.orgId}`,
        count: row._count._all,
      }));

    return {
      lineTypeStats: {
        material: materialCount,
        nonMaterial: nonMaterialCount,
      },
      monthLineTypeStats,
      orgStats,
    };
  }
}

