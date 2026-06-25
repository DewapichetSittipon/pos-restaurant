import type { CookieOptions } from 'express';

// Frontend (Cloudflare Workers) กับ backend (Render) อยู่คนละโดเมน → cross-site
// เบราว์เซอร์จะส่ง cookie ข้ามไซต์เฉพาะเมื่อ sameSite='none' + secure=true
// dev (localhost) ใช้ 'lax' + ไม่ secure เพื่อให้ทำงานบน http ได้
const isProd = process.env.NODE_ENV === 'production';

export const CROSS_SITE_COOKIE: CookieOptions = {
  sameSite: isProd ? 'none' : 'lax',
  secure: isProd,
};
