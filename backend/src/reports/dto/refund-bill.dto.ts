import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundBillDto {
  // เหตุผลการคืนเงิน
  @IsString()
  @MaxLength(300)
  reason!: string;

  // คืนสต็อกสินค้าหรือไม่ (default false — อาหารถูกกินไปแล้ว)
  @IsOptional()
  @IsBoolean()
  restoreStock?: boolean;
}
