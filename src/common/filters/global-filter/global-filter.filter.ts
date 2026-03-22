import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Catch()
export class GlobalFilter<
  T extends HttpException | Error | any,
> implements ExceptionFilter {
  catch(exception: T, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request: FastifyRequest = http.getRequest();
    const reply: FastifyReply = http.getResponse();

    if (exception instanceof HttpException) {
      const code = exception.getStatus();
      const message = exception.message;
      return reply.code(code).send({ code, message, data: [] });
    }

    if (exception instanceof Error) {
      return reply.code(500).send({
        code: 500,
        message: exception.message,
        stack: exception.stack,
      });
    }

    return reply.code(500).send({
      code: 500,
      message: typeof exception == 'string' ? exception : '没有信息',
      path: request.url,
      data: [],
    });
  }
}

