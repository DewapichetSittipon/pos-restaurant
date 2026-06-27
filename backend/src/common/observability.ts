// Error tracking + structured logging — เปิด Sentry เฉพาะเมื่อมี SENTRY_DSN (ไม่ตั้ง = no-op)
import * as Sentry from '@sentry/node';

let sentryEnabled = false;

// เรียกครั้งเดียวตอน bootstrap ก่อนสร้าง Nest app
export function initObservability(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // ไม่ตั้ง DSN = ปิดเงียบ (dev/ทดสอบไม่ต้องมี)
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // ปิด tracing เป็นค่าเริ่มต้น (เปิดเองด้วย SENTRY_TRACES_SAMPLE_RATE ถ้าต้องการ)
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  sentryEnabled = true;
}

export function isSentryEnabled(): boolean {
  return sentryEnabled;
}

// ส่ง error เข้า Sentry (ถ้าเปิด) — ปลอดภัยเสมอ ไม่ throw
export function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): void {
  if (!sentryEnabled) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // อย่าให้ระบบ log error ทำแอปล่ม
  }
}
