import type { StaffRole } from '../type/staff';

// หน้าแรกหลัง login ตามบทบาท — KITCHEN เริ่มที่หน้าครัว, ที่เหลือเริ่มที่ผังโต๊ะ
export function homePathForRole(role: StaffRole): string {
  return role === 'KITCHEN' ? '/kitchen' : '/admin';
}

export const ROLE_LABEL: Record<StaffRole, string> = {
  OWNER: 'เจ้าของร้าน',
  WAITER: 'พนักงานเสิร์ฟ',
  KITCHEN: 'ครัว',
};
