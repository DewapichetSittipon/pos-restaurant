import type { Request } from 'express';
import type { Bill, ShopStatus, Table } from '@prisma/client';

export interface JwtPayload {
  sub: number;
  username: string;
  shopId: number; // tenant ของ staff — ใช้ scope ทุก query ฝั่งพนักงาน
  // เซ็ตบน req.staff โดย JwtAuthGuard (ไม่ได้อยู่ใน token) — ใช้ gate ร้าน pending
  shopStatus?: ShopStatus;
}

export interface RequestWithStaff extends Request {
  staff?: JwtPayload;
}

// แนบ Bill ที่ผ่านการ validate qr_token แล้ว (ดู CustomerTokenGuard)
// bill.shopId ใช้ scope ฝั่งลูกค้า
export interface RequestWithBill extends Request {
  bill?: Bill & { table: Table };
}
