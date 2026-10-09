import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = process.hrtime.bigint();
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const recordMetrics = () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (response && !response.headersSent) {
        response.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
      }

      if (durationMs > 500) {
        this.logger.warn({
          method: request?.method,
          url: request?.originalUrl || request?.url,
          status: response?.statusCode,
          durationMs: Number(durationMs.toFixed(2)),
        });
      }
    };

    return next.handle().pipe(
      tap({
        next: () => recordMetrics(),
        error: () => recordMetrics(),
      }),
    );
  }
}
