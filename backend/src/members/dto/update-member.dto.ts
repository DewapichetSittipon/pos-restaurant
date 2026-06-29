import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

// แก้ไขข้อมูลสมาชิก (ชื่อ/วันเกิด) — เบอร์เปลี่ยนไม่ได้ (เป็น key)
export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  // วันเกิด (YYYY-MM-DD)
  @IsOptional()
  @IsISO8601()
  birthDate?: string;
}
