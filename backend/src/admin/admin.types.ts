import type { Request } from 'express';

export const ADMIN_TOKEN_COOKIE = 'admin_access_token';

// payload ของ platform admin — kind กันสับสนกับ token ของ staff (ที่มี shopId)
export interface PlatformAdminJwtPayload {
  sub: number;
  username: string;
  kind: 'platform';
}

export interface RequestWithAdmin extends Request {
  admin?: PlatformAdminJwtPayload;
}
