import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class CheckoutDto {
  // ส่วนลด (สตางค์) — ไม่บังคับ, default 0
  @IsOptional()
  @IsInt()
  @Min(0)
  discount?: number;

  @IsEnum(['cash', 'transfer'])
  paymentMethod!: 'cash' | 'transfer';

  // เงินที่รับมา (สตางค์) — เงินสดใช้คำนวณเงินทอน
  @IsOptional()
  @IsInt()
  @Min(0)
  receivedAmount?: number;

  // สมาชิกที่ผูกกับบิล (ได้/แลกแต้ม) — optional
  @IsOptional()
  @IsInt()
  memberId?: number;

  // แต้มที่ขอแลกเป็นส่วนลด (1 แต้ม = 1 บาท) — ระบบ cap ตามแต้มคงเหลือ/ยอดบิล
  @IsOptional()
  @IsInt()
  @Min(0)
  redeemPoints?: number;
}
