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
}
