import { IsIn, IsISO8601, IsOptional, IsString } from 'class-validator';
import { SubscriptionStatus } from '@prisma/client';

// admin เปลี่ยนแพ็กเกจ/รอบจ่ายของร้าน (เฟสแรกทำด้วยมือหลังร้านโอน)
export class SetShopPlanDto {
  @IsString()
  planKey!: string; // อ้างอิง Plan.key เช่น "free" | "pro" | "business"

  // สถานะการจ่าย (ไม่ส่ง = ตั้งเป็น active อัตโนมัติฝั่ง service)
  @IsOptional()
  @IsIn(Object.values(SubscriptionStatus))
  subscriptionStatus?: SubscriptionStatus;

  // วันหมดรอบแพ็กเกจ (ISO 8601) — null/ไม่ส่ง = ไม่กำหนด
  @IsOptional()
  @IsISO8601()
  currentPeriodEnd?: string;
}
