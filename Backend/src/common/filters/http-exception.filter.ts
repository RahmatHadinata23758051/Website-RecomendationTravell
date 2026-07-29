import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    let errorName = 'Internal Server Error';
    let messageResponse: string | string[] = 'An unexpected error occurred';

    if (typeof exceptionResponse === 'string') {
      messageResponse = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resObj = exceptionResponse as Record<string, any>;
      errorName = resObj.error || errorName;
      messageResponse = resObj.message || messageResponse;
    }

    response.status(status).json({
      statusCode: status,
      error: errorName,
      message: messageResponse,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
