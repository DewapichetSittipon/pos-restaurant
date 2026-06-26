import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  shopName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contactName!: string;

  // เบอร์ติดต่อกลับ (ไม่บังคับ) — ตัวเลข/เว้นวรรค/ขีด/บวก 6-20 ตัว
  @IsOptional()
  @Matches(/^[0-9+\-\s]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone?: string;

  // login ของร้าน — ร้านตั้งเอง
  @IsString()
  @MinLength(3)
  staffUsername!: string;

  @IsString()
  @MinLength(6)
  staffPassword!: string;
}
