import type { OrderType } from '@prisma/client';

// ป้ายภาษาไทยของประเภทออเดอร์ — ใช้แทนเลขโต๊ะบนใบเสร็จ/รายงานเมื่อเป็น takeaway/delivery
export function orderTypeLabel(type: OrderType): string {
  switch (type) {
    case 'takeaway':
      return 'กลับบ้าน';
    case 'delivery':
      return 'เดลิเวอรี';
    default:
      return 'ทานที่ร้าน';
  }
}
