import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class RefreshGuard extends AuthGuard('refresh') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    const reply = context.switchToHttp().getResponse();
    if (err || !user) {
      reply.code(401).send({
        code: 401,
        message: '刷新令牌过期',
        data: [],
      });
    }
    return user;
  }
}

