import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Type guard for Prisma's known request error.
 *
 * We avoid `instanceof Prisma.PrismaClientKnownRequestError` because the
 * runtime class lives at `@prisma/client/runtime/library` (a path that
 * changes across Prisma versions). Duck-typing is more resilient.
 */
function isPrismaKnownError(
  e: unknown,
): e is { code: string; meta?: Record<string, unknown>; message: string } {
  return (
    typeof e === 'object' &&
    e !== null &&
    'name' in e &&
    (e as { name: string }).name === 'PrismaClientKnownRequestError' &&
    'code' in e
  );
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else {
        message = (res as { message?: string | string[] }).message ?? message;
        error = (res as { error?: string }).error ?? exception.name;
      }
    } else if (isPrismaKnownError(exception)) {
      // P2002 = unique constraint, P2025 = not found
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
        error = 'Conflict';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
        error = 'Not Found';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = `Database error: ${exception.code}`;
        error = 'Bad Request';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
