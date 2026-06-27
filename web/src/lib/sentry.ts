import * as Sentry from '@sentry/react';

// เปิด error tracking เฉพาะเมื่อมี VITE_SENTRY_DSN (ไม่ตั้ง = no-op สำหรับ dev)
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
  });
}
