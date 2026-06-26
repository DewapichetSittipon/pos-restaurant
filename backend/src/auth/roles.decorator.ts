import { SetMetadata } from '@nestjs/common';
import type { StaffRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

// จำกัด endpoint ให้เฉพาะบทบาทที่ระบุ — ใช้คู่กับ RolesGuard
// ตัวอย่าง: @Roles('OWNER') หรือ @Roles('OWNER', 'WAITER')
export const Roles = (...roles: StaffRole[]) => SetMetadata(ROLES_KEY, roles);
