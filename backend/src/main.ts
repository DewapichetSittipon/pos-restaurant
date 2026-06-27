import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { initObservability } from './common/observability';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  // init ก่อนสร้าง app เพื่อให้ Sentry instrument ทัน (no-op ถ้าไม่ตั้ง SENTRY_DSN)
  initObservability();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // รูปเมนูเก็บที่ Supabase Storage (imageUrl เป็น public URL เต็ม) — ไม่เสิร์ฟจาก disk แล้ว

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );
  // จับ error ทั้งแอป: structured log + ส่ง Sentry (5xx) — ตอบ client เป็น JSON เดียวกัน
  app.useGlobalFilters(new AllExceptionsFilter());
  // CORS: รองรับหลาย origin คั่นด้วย comma ใน CORS_ORIGIN
  // ใช้ฟังก์ชันสะท้อน origin ที่อยู่ใน allowlist กลับไป — จำเป็นเพราะ credentials:true (cookie)
  // ใช้คู่กับ Access-Control-Allow-Origin: "*" ไม่ได้ ต้องตอบ origin จริง
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowAny = allowedOrigins.includes('*');
  app.enableCors({
    origin: (origin, cb) => {
      // ไม่มี origin (curl/health check/same-origin) หรืออยู่ใน allowlist → อนุญาต
      if (!origin || allowAny || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`backend listening on http://localhost:${port}/api`);
}

void bootstrap();
