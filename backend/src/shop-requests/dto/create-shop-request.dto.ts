import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateShopRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  shopName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contactName!: string;

  // เบอร์ติดต่อกลับ — ตัวเลข/เว้นวรรค/ขีด/บวก 6-20 ตัว
  @IsString()
  @Matches(/^[0-9+\-\s]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
