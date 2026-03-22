import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from '@common';
import { SYSTEM_ADMIN_ROLE_NAME } from '../common/constants/system-roles';
import { buildDeletedAccountPlaceholder } from '../common/utils/soft-delete';
import { OrgStatus, RecordStatus, UserStatus } from '@prisma/client';

const MODULE_ROLE_PREFIX = 'module:';
const MODULE_PERMISSION_KEYS = [
  'orgs',
  'orgsCreate',
  'productTypes',
  'productTypesCreate',
  'materialCategories',
  'materialCategoriesCreate',
  'graphMaterials',
  'graphMaterialsCreate',
  'graphNonMaterials',
  'purchasePlans',
  'purchaseAggregate',
  'orgControls',
  'userControls',
] as const;

/** 新增用户未指定 modulePermissions 时：排除所有「新增」子权限、非物资图谱、月度采购聚合、系统设置（人员管控） */
const DEFAULT_NEW_USER_EXCLUDED_KEYS = new Set<string>([
  'orgsCreate',
  'productTypesCreate',
  'materialCategoriesCreate',
  'graphMaterialsCreate',
  'graphNonMaterials',
  'purchaseAggregate',
  'userControls',
]);

const DEFAULT_NEW_USER_MODULE_PERMISSION_KEYS = MODULE_PERMISSION_KEYS.filter(
  (k) => !DEFAULT_NEW_USER_EXCLUDED_KEYS.has(k),
);

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeModulePermissions = (input?: string[]) => {
    if (!Array.isArray(input)) return [];
    const set = new Set(
      input
        .map((key) => String(key || '').trim())
        .filter((key) => MODULE_PERMISSION_KEYS.includes(key as any)),
    );
    return Array.from(set);
  };

  private extractModulePermissionsFromRoles = (roles?: Array<{ role?: { name?: string } }>) => {
    return (roles || [])
      .map((item) => item.role?.name || '')
      .filter((name) => name.startsWith(MODULE_ROLE_PREFIX))
      .map((name) => name.slice(MODULE_ROLE_PREFIX.length));
  };

  private syncUserModulePermissions = async (userId: number, modulePermissions?: string[]) => {
    const keys = this.normalizeModulePermissions(modulePermissions);
    await this.prisma.userRole.deleteMany({
      where: {
        userId,
        role: { name: { startsWith: MODULE_ROLE_PREFIX } },
      },
    });
    if (!keys.length) return;

    const roleIds: number[] = [];
    for (const key of keys) {
      const role = await this.prisma.role.upsert({
        where: { name: `${MODULE_ROLE_PREFIX}${key}` },
        create: { name: `${MODULE_ROLE_PREFIX}${key}` },
        update: { status: 'ACTIVE' },
        select: { id: true },
      });
      roleIds.push(role.id);
    }

    await this.prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });
  };

  getOrgControls = async (query: { fromOrgId?: string; toOrgId?: string }) => {
    const where: any = {};
    if (query.fromOrgId) where.fromOrgId = Number(query.fromOrgId);
    if (query.toOrgId) where.toOrgId = Number(query.toOrgId);

    const rows = await this.prisma.orgControl.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        fromOrg: { select: { id: true, name: true } },
        toOrg: { select: { id: true, name: true } },
      },
    });

    return {
      total: rows.length,
      items: rows.map((row) => ({
        id: row.id,
        fromOrgId: row.fromOrgId,
        fromOrgName: row.fromOrg?.name ?? '',
        toOrgId: row.toOrgId,
        toOrgName: row.toOrg?.name ?? '',
        relationType: row.relationType,
        status: row.status,
        createdAt: row.createdAt,
      })),
    };
  };

  createOrgControl = async (body: {
    fromOrgId?: number;
    toOrgId?: number;
    relationType?: string;
    status?: RecordStatus;
  }) => {
    const fromOrgId = Number(body.fromOrgId);
    const toOrgId = Number(body.toOrgId);
    const relationType = body.relationType?.trim();

    if (!Number.isFinite(fromOrgId) || !Number.isFinite(toOrgId)) {
      throw new HttpException('组织不能为空', 400);
    }
    if (fromOrgId === toOrgId) throw new HttpException('管控双方不能相同', 400);
    if (!relationType) throw new HttpException('关系类型不能为空', 400);

    const [fromOrg, toOrg] = await Promise.all([
      this.prisma.organization.findFirst({
        where: { id: fromOrgId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.organization.findFirst({
        where: { id: toOrgId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!fromOrg || !toOrg) throw new HttpException('组织不存在', 404);

    return this.prisma.orgControl.create({
      data: {
        fromOrgId,
        toOrgId,
        relationType,
        status: body.status ?? RecordStatus.ACTIVE,
      },
    });
  };

  updateOrgControl = async (
    id: number,
    body: {
      relationType?: string;
      status?: RecordStatus;
    },
  ) => {
    const existing = await this.prisma.orgControl.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new HttpException('组织管控记录不存在', 404);

    const payload: any = {};
    if (body.relationType !== undefined) {
      const relationType = body.relationType?.trim();
      if (!relationType) throw new HttpException('关系类型不能为空', 400);
      payload.relationType = relationType;
    }
    if (body.status !== undefined) payload.status = body.status;

    return this.prisma.orgControl.update({
      where: { id },
      data: payload,
    });
  };

  getUsers = async (query: { account?: string; orgId?: string }) => {
    const where: any = { deletedAt: null };
    if (query.account?.trim()) {
      where.account = { contains: query.account.trim() };
    }
    if (query.orgId) where.orgId = Number(query.orgId);

    const rows = await this.prisma.user.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        org: { select: { id: true, name: true } },
        roles: {
          include: {
            role: { select: { name: true } },
          },
        },
      },
    });

    return {
      total: rows.length,
      items: rows.map((row) => {
        const roleNames = (row.roles || []).map((x) => x.role?.name || '');
        const isSystemAdmin = roleNames.includes(SYSTEM_ADMIN_ROLE_NAME);
        return {
          id: row.id,
          account: row.account,
          userName: row.userName,
          status: row.status,
          orgId: row.orgId,
          orgName: row.org?.name ?? '',
          isSystemAdmin,
          modulePermissions: this.extractModulePermissionsFromRoles(row.roles),
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }),
    };
  };

  createUser = async (body: {
    account?: string;
    passWord?: string;
    userName?: string;
    orgId?: number | null;
    status?: UserStatus;
    modulePermissions?: string[];
  }) => {
    const account = body.account?.trim();
    const passWord = body.passWord?.trim();
    if (!account) throw new HttpException('账号不能为空', 400);
    if (!passWord) throw new HttpException('密码不能为空', 400);

    const exists = await this.prisma.user.findFirst({
      where: { account, deletedAt: null },
      select: { id: true },
    });
    if (exists) throw new HttpException('账号已存在', 409);

    if (body.orgId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: Number(body.orgId), deletedAt: null },
        select: { id: true, status: true },
      });
      if (!org) throw new HttpException('组织不存在', 404);
      if (org.status !== OrgStatus.ACTIVE) {
        throw new HttpException('组织已停用，不能绑定到用户', 400);
      }
    }

    const created = await this.prisma.user.create({
      data: {
        account,
        passWord,
        userName: body.userName?.trim() || null,
        orgId: body.orgId ? Number(body.orgId) : null,
        status: body.status ?? UserStatus.ACTIVE,
      },
    });
    const modulePermsToSync =
      body.modulePermissions !== undefined
        ? body.modulePermissions
        : [...DEFAULT_NEW_USER_MODULE_PERMISSION_KEYS];
    await this.syncUserModulePermissions(created.id, modulePermsToSync);
    return created;
  };

  updateUser = async (
    id: number,
    body: {
      userName?: string;
      passWord?: string;
      orgId?: number | null;
      status?: UserStatus;
      modulePermissions?: string[];
    },
  ) => {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new HttpException('用户不存在', 404);

    if (body.orgId) {
      const org = await this.prisma.organization.findFirst({
        where: { id: Number(body.orgId), deletedAt: null },
        select: { id: true, status: true },
      });
      if (!org) throw new HttpException('组织不存在', 404);
      if (org.status !== OrgStatus.ACTIVE) {
        throw new HttpException('组织已停用，不能绑定到用户', 400);
      }
    }

    const payload: any = {};
    if (body.userName !== undefined) payload.userName = body.userName?.trim() || null;
    if (body.passWord !== undefined) {
      const passWord = body.passWord?.trim();
      if (!passWord) throw new HttpException('密码不能为空', 400);
      payload.passWord = passWord;
    }
    if (body.orgId !== undefined) payload.orgId = body.orgId ? Number(body.orgId) : null;
    if (body.status !== undefined) payload.status = body.status;

    const updated = await this.prisma.user.update({
      where: { id },
      data: payload,
    });
    if (body.modulePermissions !== undefined) {
      await this.syncUserModulePermissions(id, body.modulePermissions);
    }
    return updated;
  };

  /**
   * 软删除用户：保留采购计划/非物资等历史数据中的 createdByUserId；清除角色并禁止登录
   */
  deleteUser = async (id: number) => {
    const existing = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: { include: { role: { select: { name: true } } } },
      },
    });
    if (!existing) throw new HttpException('用户不存在', 404);

    const isSystemAdmin = (existing.roles || []).some(
      (r) => r.role?.name === SYSTEM_ADMIN_ROLE_NAME,
    );
    if (isSystemAdmin) {
      const adminBindings = await this.prisma.userRole.count({
        where: { role: { name: SYSTEM_ADMIN_ROLE_NAME } },
      });
      if (adminBindings <= 1) {
        throw new HttpException('不能删除最后一个系统管理员', 400);
      }
    }

    const now = new Date();
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.user.update({
          where: { id },
          data: {
            deletedAt: now,
            status: UserStatus.INACTIVE,
            account: buildDeletedAccountPlaceholder(id),
          },
        });
      });
    } catch {
      throw new HttpException('删除失败：请稍后重试', 400);
    }
  };
}

