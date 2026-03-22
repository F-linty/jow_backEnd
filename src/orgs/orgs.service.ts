import { HttpException, Injectable } from '@nestjs/common';
import { OrgStatus, UserStatus } from '@prisma/client';
import { PrismaService } from '@common';
import { buildDeletedAccountPlaceholder } from '../common/utils/soft-delete';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertParentNotInSubtree = async (orgId: number, parentId: number) => {
    let cursor: number | null = parentId;
    const visited = new Set<number>();
    while (cursor !== null) {
      if (cursor === orgId) {
        throw new HttpException('父级组织不能是当前组织的下级', 400);
      }
      if (visited.has(cursor)) {
        throw new HttpException('组织层级数据异常，请联系管理员', 400);
      }
      visited.add(cursor);
      const node = await this.prisma.organization.findFirst({
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

    const rows = await this.prisma.organization.findMany({
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
    if (!isTree) {
      return {
        total: rows.length,
        items: rows,
      };
    }

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

    const tree = build(null);
    return {
      total: rows.length,
      items: tree,
    };
  }

  async create(body: { name?: string; parentId?: number | string | null; sort?: number }) {
    const name = body.name?.trim();
    if (!name) {
      throw new HttpException('组织名称不能为空', 400);
    }

    const normalizedParentId =
      body.parentId === '' || body.parentId === undefined || body.parentId === null
        ? null
        : Number(body.parentId);

    if (normalizedParentId !== null) {
      const parent = await this.prisma.organization.findFirst({
        where: { id: normalizedParentId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) {
        throw new HttpException('父级组织不存在', 404);
      }
    }

    const created = await this.prisma.organization.create({
      data: {
        name,
        parentId: normalizedParentId,
        sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
        status: OrgStatus.ACTIVE,
      },
    });

    return created;
  }

  async update(
    id: number,
    body: { name?: string; parentId?: number | string | null; sort?: number; status?: OrgStatus },
  ) {
    const existing = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new HttpException('组织不存在', 404);
    }

    const normalizedParentId =
      body.parentId === '' || body.parentId === undefined || body.parentId === null
        ? null
        : Number(body.parentId);

    if (normalizedParentId !== null) {
      const parentId = normalizedParentId;
      if (parentId === id) {
        throw new HttpException('父级组织不能是自身', 400);
      }
      const parent = await this.prisma.organization.findFirst({
        where: { id: parentId, deletedAt: null },
        select: { id: true },
      });
      if (!parent) {
        throw new HttpException('父级组织不存在', 404);
      }
      await this.assertParentNotInSubtree(id, parentId);
    }

    const payload: any = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new HttpException('组织名称不能为空', 400);
      payload.name = name;
    }
    if (body.parentId !== undefined) payload.parentId = normalizedParentId;
    if (body.sort !== undefined)
      payload.sort = Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0;
    if (body.status !== undefined) payload.status = body.status;

    return this.prisma.organization.update({
      where: { id },
      data: payload,
    });
  }

  async disable(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.organization.findFirst({
        where: { id, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!existing) {
        throw new HttpException('组织不存在', 404);
      }

      const rows = await tx.organization.findMany({
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

      await tx.organization.updateMany({
        where: {
          id: { in: Array.from(targetIds) },
          status: { not: OrgStatus.INACTIVE },
        },
        data: { status: OrgStatus.INACTIVE },
      });

      return tx.organization.findUnique({
        where: { id },
      });
    });
  }

  async enable(id: number) {
    const existing = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true, parentId: true },
    });
    if (!existing) {
      throw new HttpException('组织不存在', 404);
    }
    if (existing.status === OrgStatus.ACTIVE) return existing;

    if (existing.parentId) {
      const parent = await this.prisma.organization.findFirst({
        where: { id: existing.parentId, deletedAt: null },
        select: { id: true, status: true },
      });
      if (!parent) {
        throw new HttpException('父级组织不存在，无法启用', 400);
      }
      if (parent.status !== OrgStatus.ACTIVE) {
        throw new HttpException('请先启用父级组织', 400);
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: OrgStatus.ACTIVE },
    });
  }

  /**
   * 软删除：本组织及子组织全部标记删除；下属用户一并软删除。
   * 采购计划/聚合/非物资等历史数据仍保留 orgId 外键，仅不再出现在组织树与人员列表。
   */
  async remove(id: number) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.organization.findFirst({
          where: { id, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!existing) {
          throw new HttpException('组织不存在', 404);
        }

        const rows = await tx.organization.findMany({
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

        const orgIdList = Array.from(targetIds);
        const now = new Date();

        const users = await tx.user.findMany({
          where: { orgId: { in: orgIdList }, deletedAt: null },
          select: { id: true },
        });
        for (const u of users) {
          await tx.userRole.deleteMany({ where: { userId: u.id } });
          await tx.user.update({
            where: { id: u.id },
            data: {
              deletedAt: now,
              status: UserStatus.INACTIVE,
              account: buildDeletedAccountPlaceholder(u.id),
            },
          });
        }

        await tx.organization.updateMany({
          where: { id: { in: orgIdList } },
          data: { deletedAt: now, status: OrgStatus.INACTIVE },
        });

        return tx.organization.findFirst({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('删除失败：请稍后重试', 400);
    }
  }
}

