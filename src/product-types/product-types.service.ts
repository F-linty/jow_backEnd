import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common';
import { RecordStatus } from '@prisma/client';

@Injectable()
export class ProductTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private assertParentNotInSubtree = async (nodeId: number, parentId: number) => {
    let cursor: number | null = parentId;
    const visited = new Set<number>();
    while (cursor !== null) {
      if (cursor === nodeId) {
        throw new HttpException('父级产品类型不能是当前类型的下级', 400);
      }
      if (visited.has(cursor)) {
        throw new HttpException('产品类型层级数据异常，请联系管理员', 400);
      }
      visited.add(cursor);
      const node = await this.prisma.productType.findFirst({
        where: { id: cursor, deletedAt: null },
        select: { parentId: true },
      });
      if (!node) break;
      cursor = node.parentId ?? null;
    }
  };

  async list(query: { keyword?: string; tree?: string }) {
    const keyword = query.keyword?.trim();
    const where: any = { deletedAt: null };
    if (keyword) {
      where.name = { contains: keyword };
    }

    const rows = await this.prisma.productType.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        parentId: true,
        status: true,
        sort: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const isTree = query.tree !== '0';
    if (!isTree) return { total: rows.length, items: rows };

    const byParent = new Map<number | null, any[]>();
    rows.forEach((item) => {
      const p = item.parentId ?? null;
      const list = byParent.get(p) ?? [];
      list.push({ ...item, children: [] });
      byParent.set(p, list);
    });

    const build = (parentId: number | null) => {
      const list = byParent.get(parentId) ?? [];
      return list.map((node) => ({
        ...node,
        children: build(node.id),
      }));
    };

    return { total: rows.length, items: build(null) };
  }

  async create(body: { name?: string; parentId?: number | string | null; sort?: number }) {
    const name = body.name?.trim();
    if (!name) throw new HttpException('产品类型名称不能为空', 400);

    const normalizedParentId =
      body.parentId === '' || body.parentId === undefined || body.parentId === null
        ? null
        : Number(body.parentId);

    if (normalizedParentId !== null) {
      const parent = await this.prisma.productType.findFirst({
        where: { id: normalizedParentId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new HttpException('父级产品类型不存在', 404);
    }

    return this.prisma.productType.create({
      data: {
        name,
        parentId: normalizedParentId,
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
        status: RecordStatus.ACTIVE,
      },
    });
  }

  async update(
    id: number,
    body: { name?: string; parentId?: number | string | null; sort?: number; status?: RecordStatus },
  ) {
    const existing = await this.prisma.productType.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new HttpException('产品类型不存在', 404);

    const normalizedParentId =
      body.parentId === '' || body.parentId === undefined || body.parentId === null
        ? null
        : Number(body.parentId);

    if (normalizedParentId !== null) {
      const parentId = normalizedParentId;
      if (parentId === id) throw new HttpException('父级产品类型不能是自身', 400);
      const parent = await this.prisma.productType.findFirst({
        where: { id: parentId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) throw new HttpException('父级产品类型不存在', 404);
      await this.assertParentNotInSubtree(id, parentId);
    }

    const payload: any = {};
    if (body.name !== undefined) {
      const n = body.name.trim();
      if (!n) throw new HttpException('产品类型名称不能为空', 400);
      payload.name = n;
    }
    if (body.parentId !== undefined) payload.parentId = normalizedParentId;
    if (body.sort !== undefined)
      payload.sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0;
    if (body.status !== undefined) payload.status = body.status;

    return this.prisma.productType.update({
      where: { id },
      data: payload,
    });
  }

  async disable(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productType.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new HttpException('产品类型不存在', 404);
      }

      const rows = await tx.productType.findMany({
        where: { deletedAt: null },
        select: { id: true, parentId: true },
      });
      const childrenByParent = new Map<number, number[]>();
      rows.forEach((row) => {
        if (row.parentId === null) return;
        const list = childrenByParent.get(row.parentId) ?? [];
        list.push(row.id);
        childrenByParent.set(row.parentId, list);
      });
      const targetIds = new Set<number>([id]);
      const queue: number[] = [id];
      while (queue.length) {
        const current = queue.shift()!;
        const children = childrenByParent.get(current) ?? [];
        children.forEach((childId) => {
          if (targetIds.has(childId)) return;
          targetIds.add(childId);
          queue.push(childId);
        });
      }

      await tx.productType.updateMany({
        where: {
          id: { in: Array.from(targetIds) },
          status: { not: RecordStatus.INACTIVE },
        },
        data: { status: RecordStatus.INACTIVE },
      });

      return tx.productType.findUnique({ where: { id } });
    });
  }

  async enable(id: number) {
    const existing = await this.prisma.productType.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, parentId: true },
    });
    if (!existing) {
      throw new HttpException('产品类型不存在', 404);
    }
    if (existing.status === RecordStatus.ACTIVE) return existing;

    if (existing.parentId) {
      const parent = await this.prisma.productType.findFirst({
        where: { id: existing.parentId, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!parent) {
        throw new HttpException('父级产品类型不存在，无法启用', 400);
      }
      if (parent.status !== RecordStatus.ACTIVE) {
        throw new HttpException('请先启用父级产品类型', 400);
      }
    }

    return this.prisma.productType.update({
      where: { id },
      data: { status: RecordStatus.ACTIVE },
    });
  }

  /**
   * 软删除：本产品类型及子级全部标记删除；历史业务外键保留。
   */
  async remove(id: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.productType.findFirst({
          where: { id, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!existing) {
          throw new HttpException('产品类型不存在', 404);
        }

        const rows = await tx.productType.findMany({
          where: { deletedAt: null },
          select: { id: true, parentId: true },
        });
        const childrenByParent = new Map<number, number[]>();
        rows.forEach((row) => {
          if (row.parentId === null) return;
          const list = childrenByParent.get(row.parentId) ?? [];
          list.push(row.id);
          childrenByParent.set(row.parentId, list);
        });

        const targetIds = new Set<number>([id]);
        const queue: number[] = [id];
        while (queue.length) {
          const cur = queue.shift()!;
          const children = childrenByParent.get(cur) ?? [];
          for (const c of children) {
            if (!targetIds.has(c)) {
              targetIds.add(c);
              queue.push(c);
            }
          }
        }

        const now = new Date();
        await tx.productType.updateMany({
          where: { id: { in: Array.from(targetIds) } },
          data: { deletedAt: now, status: RecordStatus.INACTIVE },
        });

        return tx.productType.findFirst({ where: { id } });
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('删除失败：请稍后重试', 400);
    }
  }
}
