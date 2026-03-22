import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class GraphService {
  constructor(private readonly prisma: PrismaService) {}

  async listMaterials(query: {
    keyword?: string;
    productTypeId?: string;
    materialCategoryId?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.keyword?.trim()) {
      where.itemName = { contains: query.keyword.trim() };
    }
    if (query.productTypeId) where.productTypeId = Number(query.productTypeId);
    if (query.materialCategoryId)
      where.materialCategoryId = Number(query.materialCategoryId);

    const [total, rows] = await Promise.all([
      this.prisma.materialItem.count({ where }),
      this.prisma.materialItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          productType: { select: { id: true, name: true } },
          materialCategory: { select: { id: true, name: true } },
        },
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      itemImage: row.itemImage,
      itemName: row.itemName,
      brand: row.brand,
      spec: row.spec,
      unit: row.unit,
      demandQty: row.demandQty,
      unitPrice: row.unitPrice,
      subtotal: row.subtotal,
      total: row.total,
      status: row.status,
      productTypeId: row.productTypeId,
      productTypeName: row.productType?.name ?? '',
      materialCategoryId: row.materialCategoryId,
      materialCategoryName: row.materialCategory?.name ?? '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { total, page, pageSize, items };
  }

  async createMaterial(body: any) {
    const itemName = body.itemName?.trim();
    if (!itemName) throw new HttpException('物资名称不能为空', 400);

    const productTypeId = Number(body.productTypeId);
    const materialCategoryId = Number(body.materialCategoryId);
    if (!Number.isFinite(productTypeId)) throw new HttpException('产品类型不能为空', 400);
    if (!Number.isFinite(materialCategoryId))
      throw new HttpException('物料分类不能为空', 400);

    return this.prisma.materialItem.create({
      data: {
        itemImage: body.itemImage?.trim() || null,
        itemName,
        brand: body.brand?.trim() || null,
        spec: body.spec?.trim() || null,
        unit: body.unit?.trim() || null,
        demandQty: body.demandQty ?? null,
        unitPrice: body.unitPrice ?? null,
        subtotal: body.subtotal ?? null,
        total: body.total ?? null,
        productTypeId,
        materialCategoryId,
        status: body.status === 'INACTIVE' ? RecordStatus.INACTIVE : RecordStatus.ACTIVE,
      },
    });
  }

  async updateMaterial(id: number, body: any) {
    const existing = await this.prisma.materialItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new HttpException('物资图谱记录不存在', 404);

    const payload: any = {};
    if (body.itemName !== undefined) {
      const itemName = body.itemName?.trim();
      if (!itemName) throw new HttpException('物资名称不能为空', 400);
      payload.itemName = itemName;
    }
    if (body.itemImage !== undefined) payload.itemImage = body.itemImage || null;
    if (body.brand !== undefined) payload.brand = body.brand?.trim() || null;
    if (body.spec !== undefined) payload.spec = body.spec?.trim() || null;
    if (body.unit !== undefined) payload.unit = body.unit?.trim() || null;
    if (body.demandQty !== undefined) payload.demandQty = body.demandQty;
    if (body.unitPrice !== undefined) payload.unitPrice = body.unitPrice;
    if (body.subtotal !== undefined) payload.subtotal = body.subtotal;
    if (body.total !== undefined) payload.total = body.total;
    if (body.productTypeId !== undefined)
      payload.productTypeId = Number(body.productTypeId);
    if (body.materialCategoryId !== undefined)
      payload.materialCategoryId = Number(body.materialCategoryId);
    if (body.status !== undefined) payload.status = body.status;

    return this.prisma.materialItem.update({
      where: { id },
      data: payload,
    });
  }

  async listNonMaterials(query: {
    keyword?: string;
    orgId?: string;
    adopted?: string;
    page?: string;
    pageSize?: string;
  }) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.keyword?.trim()) {
      where.itemName = { contains: query.keyword.trim() };
    }
    if (query.orgId) where.orgId = Number(query.orgId);
    if (query.adopted === 'true') where.adopted = true;
    if (query.adopted === 'false') where.adopted = false;

    const [total, rows] = await Promise.all([
      this.prisma.nonMaterialItem.count({ where }),
      this.prisma.nonMaterialItem.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          org: { select: { id: true, name: true } },
          productType: { select: { id: true, name: true } },
          materialCategory: { select: { id: true, name: true } },
          createdBy: { select: { id: true, account: true } },
        },
      }),
    ]);

    const items = rows.map((row) => ({
      id: row.id,
      itemName: row.itemName,
      itemImage: row.itemImage,
      brand: row.brand,
      spec: row.spec,
      unit: row.unit,
      demandQty: row.demandQty,
      unitPrice: row.unitPrice,
      subtotal: row.subtotal,
      total: row.total,
      status: row.status,
      adopted: row.adopted,
      orgId: row.orgId,
      orgName: row.org?.name ?? '',
      productTypeName: row.productType?.name ?? '',
      materialCategoryName: row.materialCategory?.name ?? '',
      createdBy: row.createdBy?.account ?? '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { total, page, pageSize, items };
  }

  async updateNonMaterialAdopted(id: number, adopted: boolean) {
    const existing = await this.prisma.nonMaterialItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new HttpException('非物资图谱记录不存在', 404);

    return this.prisma.nonMaterialItem.update({
      where: { id },
      data: { adopted },
    });
  }
}

