import {
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateMemberDto {
  // เบอร์โทร (ใช้เป็น key ของสมาชิก) — ตัวเลข/ขีด 6–20 ตัว
  @IsString()
  @Matches(/^[0-9-]{6,20}$/, { message: 'เบอร์โทรไม่ถูกต้อง' })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  // วันเกิด (YYYY-MM-DD) — ใช้โปรวันเกิด; เก็บเฉพาะ วัน/เดือน ตอนเทียบ
  @IsOptional()
  @IsISO8601()
  birthDate?: string;
}
