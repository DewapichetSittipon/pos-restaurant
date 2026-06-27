import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { captureError } from './observability';

// ตัวจับ exception กลางทั้งแอป:
//  - 4xx (HttpException) = ความผิดฝั่ง client → log ระดับ warn สั้น ๆ ไม่ส่ง Sentry
//  - 5xx / error ไม่คาดคิด → log แบบ structured + stack แล้วส่ง Sentry (ถ้าเปิด)
//  - ตอบ client เป็น JSON รูปแบบเดียวกันเสมอ (ไม่หลุด stack ออกไปฝั่งนอก)
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isHttp = exception instanceof HttpException;
    const payload = isHttp
      ? (exception.getResponse() as string | Record<string, unknown>)
      : { statusCode: status, message: 'เกิดข้อผิดพลาดภายในระบบ' };

    const message =
      exception instanceof Error ? exception.message : String(exception);

    const logLine = `${req.method} ${req.originalUrl} → ${status} : ${message}`;

    if (status >= 500) {
      // error จริง — เก็บ stack + ส่ง Sentry
      this.logger.error(
        logLine,
        exception instanceof Error ? exception.stack : undefined,
      );
      captureError(exception, {
        method: req.method,
        url: req.originalUrl,
        status,
      });
    } else {
      // client error (validation/auth/not found ฯลฯ) — แค่ warn
      this.logger.warn(logLine);
    }

    res.status(status).json(
      typeof payload === 'string' ? { statusCode: status, message: payload } : payload,
    );
  }
}
