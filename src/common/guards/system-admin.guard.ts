import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SYSTEM_ADMIN_ROLE_NAME } from '../constants/system-roles';

/**
 * 仅允许绑定「系统管理员」角色的用户访问（人员管控等）
 */
@Injectable()
export class SystemAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (userId === undefined || userId === null) {
      throw new ForbiddenException('无权访问');
    }
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId: Number(userId),
        role: { name: SYSTEM_ADMIN_ROLE_NAME },
      },
      select: { userId: true },
    });
    if (!row) {
      throw new ForbiddenException('仅系统管理员可访问');
    }
    return true;
  }
}
