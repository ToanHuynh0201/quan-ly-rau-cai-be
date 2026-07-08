import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { HEALTH_CHECK_PATH } from '../constants';
import { Prisma } from '../../generated/prisma/client';

interface ErrorBody {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    if (
      request.path.endsWith(HEALTH_CHECK_PATH) &&
      exception instanceof HttpException
    ) {
      httpAdapter.reply(
        ctx.getResponse(),
        exception.getResponse(),
        exception.getStatus(),
      );
      return;
    }

    let statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        const { message: bodyMessage, error: bodyError } = body as {
          message?: string | string[];
          error?: string;
        };
        const resolvedMessage = bodyMessage ?? exception.message;
        message = Array.isArray(resolvedMessage)
          ? resolvedMessage.join(', ')
          : resolvedMessage;
        error = bodyError ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined)?.join(
            ', ',
          );
          statusCode = HttpStatus.CONFLICT;
          message = target
            ? `Data already exists (duplicate ${target})`
            : 'Data already exists';
          error = 'Conflict';
          break;
        }
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          error = 'Not Found';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Data error';
          error = 'Bad Request';
      }
    }

    const errorBody: ErrorBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request) as string,
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${errorBody.path} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${errorBody.path} - ${message}`);
    }

    httpAdapter.reply(
      ctx.getResponse(),
      { success: false, error: errorBody },
      statusCode,
    );
  }
}
