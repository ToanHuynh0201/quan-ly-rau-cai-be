import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HEALTH_CHECK_PATH } from '../constants';

export interface Envelope<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  Envelope<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T> | T> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path.endsWith(HEALTH_CHECK_PATH)) {
      return next.handle();
    }

    const statusCode = context
      .switchToHttp()
      .getResponse<Response>().statusCode;

    return next.handle().pipe(
      map((result) => ({
        success: true,
        statusCode,
        message: 'Success',
        data: result,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
