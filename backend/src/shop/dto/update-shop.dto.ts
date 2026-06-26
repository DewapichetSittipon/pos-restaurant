import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateShopDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxId?: string;

  // PromptPay ID — เบอร์มือถือ/เลขบัตรประชาชน/เลขนิติบุคคล
  @IsOptional()
  @IsString()
  @MaxLength(20)
  promptpayId?: string;

  // VAT — basis points (0–3000 = 0–30%); 0 = ไม่คิด
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  vatRate?: number;

  // true = ราคาเมนูรวม VAT แล้ว, false = บวก VAT เพิ่มจากยอด
  @IsOptional()
  @IsBoolean()
  vatInclusive?: boolean;

  // เซอร์วิสชาร์จ — basis points (0–3000 = 0–30%); 0 = ไม่คิด
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3000)
  serviceChargeRate?: number;

  // แต้มสะสมต่อ 100 บาท (0 = ปิดระบบสมาชิก)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  loyaltyEarnRate?: number;
}
