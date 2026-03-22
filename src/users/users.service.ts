import { HttpException, Injectable } from '@nestjs/common';
import { AuthService, PrismaService } from '../common';
import { SYSTEM_ADMIN_ROLE_NAME } from '../common/constants/system-roles';

const MODULE_ROLE_PREFIX = 'module:';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async create(user) {
    const { account, passWord } = user;
    if (!account?.trim() || !passWord?.trim()) {
      if (!account?.trim()) {
        throw new HttpException('账号不能为空', 400);
      } else {
        throw new HttpException('密码不能为空', 400);
      }
    }
    const dbUser = await this.prisma.user.findFirst({
      where: { account: account.trim(), deletedAt: null },
    });
    if (!dbUser) throw new HttpException('用户不存在', 404);
    if (passWord.trim() !== dbUser.passWord)
      throw new HttpException('密码错误', 401);
    if (
      account.trim() === dbUser.account &&
      passWord.trim() === dbUser.passWord
    ) {
      const { token, refToken } = await this.authService.Generate(
        dbUser.id,
      );
      return {
        code: 200,
        message: '登入成功',
        data: [{ token, refToken }],
      };
    }
  }

  findOne(id: number) {
    // 注意：JWT payload 里 userId 是数字时，前端传来的 id 也会是数字
    // 这里按 Prisma 的 id（Int）查询
    return this.prisma.user
      .findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true,
          userName: true,
          account: true,
          avatar: true,
          status: true,
          orgId: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            include: {
              role: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })
      .then((dbUser) => {
        if (!dbUser) {
          throw new HttpException('用户不存在', 404);
        }
        const roleNames = (dbUser.roles || []).map((item) => item.role?.name || '');
        const isSystemAdmin = roleNames.includes(SYSTEM_ADMIN_ROLE_NAME);
        const modulePermissions = roleNames
          .filter((name) => name.startsWith(MODULE_ROLE_PREFIX))
          .map((name) => name.slice(MODULE_ROLE_PREFIX.length));
        const { roles: _r, ...rest } = dbUser;
        return {
          code: 200,
          message: '查询成功',
          data: [
            {
              ...rest,
              isSystemAdmin,
              modulePermissions,
            },
          ],
        };
      });
  }
}

