import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectShopRequestDto {
  // เหตุผลที่ปฏิเสธ (ไม่บังคับ) — เก็บไว้ดูภายหลัง
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNote?: string;
}
